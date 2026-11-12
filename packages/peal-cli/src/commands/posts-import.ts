import { Console, Effect, FileSystem, Match, Option, Path } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  duplicateWindowHours,
  idempotencyKeyLifetimeHours,
  ImportResultSchema,
  maxIdempotencyKeyLength,
  maxImportLength,
  maxImportRows,
} from "peal-contract";
import type { ImportResult, ImportRowResult, PostRefusal } from "peal-contract";

import {
  duplicateChannels,
  explainingPublishing,
  violationOf,
} from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { cannotRead } from "#media-files.ts";
import { planLimitReason } from "#plan-limit.ts";
import { columns } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

// The mark some programs write before a file's first character.
const byteOrderMark = String.fromCodePoint(0xfe_ff);

// Why a row's post was refused, as its author corrects the row.
const refusalOf = (refusal: PostRefusal): string =>
  Match.valueTags(refusal, {
    ChannelSetNotFound: () =>
      "its channels name a channel set the workspace does not have: peal sets list shows them",
    DuplicatePost: ({ duplicates, message }) =>
      // Another row of the file, which has no post yet: the server says
      // which.
      duplicates.length === 0 && message !== undefined && message !== ""
        ? message
        : `the same content already goes to ${duplicateChannels(duplicates)}, less than ${String(duplicateWindowHours)} hours from its time: set its allow_duplicate to true if you mean to post it twice`,
    Forbidden: () =>
      "your role in this workspace does not allow it: a post with media needs the right to read the workspace's media",
    IdempotencyKeyReused: () =>
      `its idempotency key was sent in the last ${String(idempotencyKeyLifetimeHours)} hours with another post: give the row a new one`,
    InvalidTimeZone: ({ timeZone }) =>
      `${timeZone} is not a time zone Peal knows: give an IANA zone, such as Europe/Paris`,
    PlanLimitReached: planLimitReason,
    PostContentInvalid: ({ violations }) =>
      violations.map(violationOf).join("; "),
    PostNotFound: () =>
      "the post its idempotency key made was deleted: give the row a new key to make it again",
    QueueHasNoRoom: () =>
      "its queue has no free slot: add slots with peal queues update --slot, or give the row a time",
    QueueNotFound: () =>
      "it names a queue the workspace does not have: peal queues list shows them",
    ScheduleInPast: () => "its time has passed: give it a later one, or now",
    SignatureNotFound: () =>
      "it names a signature the workspace does not have: peal signatures list shows them",
    UnknownChannels: ({ channelIds }) =>
      `these channels are not the workspace's: ${channelIds.join(", ")}`,
    UnknownMedia: ({ mediaIds }) =>
      `these media are not the workspace's, or not ready: ${mediaIds.join(", ")}`,
    UnknownTags: ({ tagIds }) =>
      `these tags are not the workspace's: ${tagIds.join(", ")}`,
  });

// The cells of a row that could not be read, each with what is wrong.
const cellProblems = (
  problems: Extract<ImportRowResult, { _tag: "unreadable" }>["problems"]
): string =>
  problems
    .map(
      ({ column, problem }) =>
        `${column} ${problem === "missing" ? "is missing" : "cannot be read"}`
    )
    .join(", ");

// What became of a row, after its number and its result's name.
const detailOf = (row: ImportRowResult): string =>
  Match.valueTags(row, {
    created: ({ post, replayed }) =>
      replayed
        ? `post ${post.id} (made before, under this idempotency key)`
        : `post ${post.id}`,
    refused: ({ refusal }) => refusalOf(refusal),
    unreadable: ({ cells, problems }) =>
      cells === undefined
        ? cellProblems(problems)
        : `it has ${String(cells.found)} cells where the first line names ${String(cells.expected)}: write a cell that holds a comma between double quotes`,
    valid: () => "",
  });

const rowLines = (result: ImportResult): string[] =>
  columns(
    result.rows.map((row) => [
      `  row ${String(row.row)}`,
      row._tag,
      detailOf(row),
    ])
  );

// What the rows that were made came to.
const madeOf = (result: ImportResult): string => {
  const total = result.rows.length;

  const before = result.rows.filter(
    (row) => row._tag === "created" && row.replayed
  ).length;

  const made = result.created - before;

  if (made === 0) {
    return `Made no new post: the ${plural(total, "row was", "rows were")} made before.`;
  }

  return before === 0
    ? `Made ${plural(made, "post", "posts")} from ${plural(total, "row", "rows")}.`
    : `Made ${plural(made, "post", "posts")} from ${plural(total, "row", "rows")}; ${plural(before, "other was", "others were")} made before.`;
};

// The summary of an import whose rows all went through.
const summaryOf = (result: ImportResult): string => {
  const total = result.rows.length;

  if (total === 0) {
    return "The file lists no post under its first line: nothing was made.";
  }

  return result.dryRun
    ? `Checked ${plural(total, "row", "rows")}, and made nothing: every row is valid. Run it again without --dry-run to make them.`
    : madeOf(result);
};

// Why an import ends as a refusal: the rows that cannot be made, if any.
const refusalFor = (result: ImportResult): Option.Option<Refused> => {
  const kept = result.rows.filter(
    ({ _tag }) => _tag === "refused" || _tag === "unreadable"
  );

  if (kept.length === 0) {
    return Option.none();
  }

  const numbers = kept.map(({ row }) => String(row)).join(", ");
  const rows = `${kept.length === 1 ? "row" : "rows"} ${numbers}`;

  return Option.some(
    new Refused({
      reason:
        result.created === 0
          ? `${String(kept.length)} of ${plural(result.rows.length, "row", "rows")} cannot be made (${rows}), so nothing was made. Correct them, then import the file again.`
          : `${plural(result.created, "post was", "posts were")} made, and ${rows} refused meanwhile. Correct those rows, then import them in a file of their own: importing this file again would make the others twice.`,
    })
  );
};

// The file's text, read whole: never printed, as a file named by mistake
// holds anything.
const contentsOf = (given: string) =>
  Effect.gen(function* reading() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const tooLong = new Refused({
      reason: `${given} is longer than one import takes, ${String(maxImportLength)} characters: split it. Nothing was made.`,
    });

    // Before reading it: a file named by mistake may be of any size, and
    // a character takes four bytes at most.
    const { size } = yield* fs
      .stat(path.resolve(given))
      .pipe(Effect.mapError(cannotRead(given)));

    if (Number(size) > maxImportLength * 4) {
      return yield* tooLong;
    }

    const contents = yield* fs
      .readFileString(path.resolve(given))
      .pipe(Effect.mapError(cannotRead(given)));

    const csv = contents.startsWith(byteOrderMark)
      ? contents.slice(byteOrderMark.length)
      : contents;

    if (csv.length > maxImportLength) {
      return yield* tooLong;
    }

    return csv;
  });

export const importPosts = Command.make(
  "import",
  {
    dryRun: Flag.Boolean("dry-run").pipe(
      Flag.withDescription(
        "Check every row and make nothing, even when all of them are valid."
      ),
      Flag.withDefault(false)
    ),
    file: Argument.String("file").pipe(
      Argument.withDescription(
        `A CSV file of at most ${String(maxImportRows)} posts, one per row under a first line that names its columns, in any order: text, channels (channel ids separated by spaces, commas or semicolons; a channel set's id or its name, as peal sets list shows them, stands for its connected channels, when the name holds no space, comma or semicolon) and at (now, an instant with its offset, or a local time read in the row's time_zone) are required; media (ids of the workspace's media), time_zone, allow_duplicate (true or false) and idempotency_key are optional. A cell with a comma, a quote or a line break goes between double quotes, a quote inside it written twice.`
      )
    ),
    idempotencyKey: Flag.String("idempotency-key").pipe(
      Flag.withMetavar("<key>"),
      Flag.withDescription(
        `Any text of your choosing, ${String(maxIdempotencyKeyLength)} characters at most, such as a UUID, that makes the import safe to run again: within ${String(idempotencyKeyLifetimeHours)} hours, the same key with the same file answers the posts the first run made, row by row, and makes only those it could not make then. A row's own idempotency_key is used instead for that row.`
      ),
      Flag.optional
    ),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("posts.import")(function* importPosts(input) {
    yield* Option.exists(
      input.idempotencyKey,
      (key) => key === "" || key.length > maxIdempotencyKeyLength
    )
      ? Effect.fail(
          new Refused({
            reason: `--idempotency-key takes 1 to ${String(maxIdempotencyKeyLength)} characters.`,
          })
        )
      : Effect.void;

    const csv = yield* contentsOf(input.file);
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const result = yield* client.posts
      .import({
        headers: Option.match(input.idempotencyKey, {
          onNone: () => ({}),
          onSome: (key) => ({ "idempotency-key": key }),
        }),
        params: { workspaceId: workspace.id },
        payload: input.dryRun ? { csv, dryRun: true } : { csv },
      })
      .pipe(explainingPublishing(url));

    const refusal = refusalFor(result);

    if (input.json) {
      yield* printJson(ImportResultSchema, result);
    } else {
      for (const line of rowLines(result)) {
        yield* Console.log(line);
      }

      if (Option.isNone(refusal)) {
        yield* Console.log(summaryOf(result));
      }
    }

    // Every row is printed first: the refusal says which to correct.
    yield* Option.isSome(refusal) ? refusal.value : Effect.void;
  })
).pipe(
  Command.withDescription(
    "Create and send the posts a CSV file lists, one per row, each as peal post would: to the public of the accounts its channels connect, at its time or now. A row's channels may name a channel set instead of listing its channels. Every row is checked first, and nothing is made unless all of them are valid; each row is printed with what became of it. --dry-run checks the file and makes nothing."
  )
);
