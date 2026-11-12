import { Match } from "effect";
import {
  duplicateWindowHours,
  idempotencyKeyLifetimeHours,
} from "peal-contract";
import type {
  ContentViolation,
  ImportCellProblem,
  ImportProblem,
  PlanLimitReached,
  PostRefusal,
  QueueNoRoom,
} from "peal-contract";

// Why a row of a CSV import was refused, or why the file or a row could
// not be read, as message keys of the catalogues and their arguments: the
// composer's words where the refusal is the same as in the composer, the
// import's own where a row of a file says it otherwise. Never the server's
// English `message`, which a French page would show as it is.

export type ImportRefusalWords =
  | {
      readonly key: "Posts.Composer.errors.content";
      readonly violations: readonly ContentViolation[];
    }
  | {
      readonly key: "Billing.limitReached";
      readonly limit: PlanLimitReached["limit"];
      readonly refusal: PlanLimitReached;
    }
  | {
      readonly key: "Posts.Composer.errors.queueNoRoom";
      readonly reason: QueueNoRoom;
    }
  | {
      readonly key:
        | "Posts.Composer.errors.inPast"
        | "Posts.Composer.errors.queueNotFound"
        | "Posts.Import.refusal.duplicateInFile"
        | "Posts.Import.refusal.forbidden"
        | "Posts.Import.refusal.postGone"
        | "Posts.Import.refusal.unknownSet"
        | "Posts.Import.refusal.unknownSignature";
    }
  | {
      readonly key:
        | "Posts.Import.refusal.duplicate"
        | "Posts.Import.refusal.keyReused";
      readonly hours: number;
    }
  | {
      readonly key:
        | "Posts.Import.refusal.unknownChannels"
        | "Posts.Import.refusal.unknownMedia"
        | "Posts.Import.refusal.unknownTags";
      readonly ids: string;
    }
  | { readonly key: "Posts.Import.refusal.timeZone"; readonly zone: string };

// Contextual typing keeps each key a literal.
const words = (chosen: ImportRefusalWords): ImportRefusalWords => chosen;

const listed = (ids: readonly string[]): string => ids.join(", ");

/**
 * The words for a row's refusal. The match is exhaustive: a refusal the
 * contract adds does not compile until it has words.
 */
export const importRefusalWords = (refusal: PostRefusal): ImportRefusalWords =>
  Match.valueTags(refusal, {
    ChannelSetNotFound: () => words({ key: "Posts.Import.refusal.unknownSet" }),
    // Against another row of the file, `duplicates` is empty and only the
    // server's English message names the row: a sentence of its own.
    DuplicatePost: ({ duplicates }) =>
      duplicates.length === 0
        ? words({ key: "Posts.Import.refusal.duplicateInFile" })
        : words({
            hours: duplicateWindowHours,
            key: "Posts.Import.refusal.duplicate",
          }),
    // A row with media needs media:read, which the others do not.
    Forbidden: () => words({ key: "Posts.Import.refusal.forbidden" }),
    IdempotencyKeyReused: () =>
      words({
        hours: idempotencyKeyLifetimeHours,
        key: "Posts.Import.refusal.keyReused",
      }),
    InvalidTimeZone: ({ timeZone }) =>
      words({
        key: "Posts.Import.refusal.timeZone",
        zone: timeZone,
      }),
    PlanLimitReached: (reached) =>
      words({
        key: "Billing.limitReached",
        limit: reached.limit,
        refusal: reached,
      }),
    PostContentInvalid: ({ violations }) =>
      words({
        key: "Posts.Composer.errors.content",
        violations,
      }),
    PostNotFound: () => words({ key: "Posts.Import.refusal.postGone" }),
    QueueHasNoRoom: ({ reason }) =>
      words({
        key: "Posts.Composer.errors.queueNoRoom",
        reason,
      }),
    QueueNotFound: () => words({ key: "Posts.Composer.errors.queueNotFound" }),
    ScheduleInPast: () => words({ key: "Posts.Composer.errors.inPast" }),
    SignatureNotFound: () =>
      words({ key: "Posts.Import.refusal.unknownSignature" }),
    UnknownChannels: ({ channelIds }) =>
      words({
        ids: listed(channelIds),
        key: "Posts.Import.refusal.unknownChannels",
      }),
    UnknownMedia: ({ mediaIds }) =>
      words({
        ids: listed(mediaIds),
        key: "Posts.Import.refusal.unknownMedia",
      }),
    UnknownTags: ({ tagIds }) =>
      words({
        ids: listed(tagIds),
        key: "Posts.Import.refusal.unknownTags",
      }),
  });

/** The words for a file the server cannot read as posts at all. */
export interface UnreadableWords {
  // The column the problem is about, or "" with `named` "no".
  readonly column: string;
  readonly key: `Posts.Import.unreadable.${ImportProblem}`;
  readonly named: "no" | "yes";
}

// One key a problem: a record over every problem, so a new one does not
// compile until it has words.
const unreadableKeys: Readonly<Record<ImportProblem, UnreadableWords["key"]>> =
  {
    empty: "Posts.Import.unreadable.empty",
    missingColumn: "Posts.Import.unreadable.missingColumn",
    repeatedColumn: "Posts.Import.unreadable.repeatedColumn",
    strayQuote: "Posts.Import.unreadable.strayQuote",
    tooManyRows: "Posts.Import.unreadable.tooManyRows",
    unknownColumn: "Posts.Import.unreadable.unknownColumn",
    unterminatedQuote: "Posts.Import.unreadable.unterminatedQuote",
  };

export const unreadableWords = (
  problem: ImportProblem,
  column: string | null
): UnreadableWords => ({
  column: column ?? "",
  key: unreadableKeys[problem],
  named: column === null ? "no" : "yes",
});

/** The words for a row that could not be read, cell by cell or whole. */
export type CellWords =
  | {
      readonly column: string;
      readonly key: "Posts.Import.cell.invalid" | "Posts.Import.cell.missing";
    }
  | {
      readonly expected: number;
      readonly found: number;
      readonly key: "Posts.Import.cell.count";
    };

// One key a cell problem: a record over every problem, so a new one does
// not compile until it has words.
const cellKeys: Readonly<
  Record<
    ImportCellProblem["problem"],
    "Posts.Import.cell.invalid" | "Posts.Import.cell.missing"
  >
> = {
  invalid: "Posts.Import.cell.invalid",
  missing: "Posts.Import.cell.missing",
};

export const cellWords = (
  problem:
    | ImportCellProblem
    | { readonly expected: number; readonly found: number }
): CellWords =>
  "column" in problem
    ? { column: problem.column, key: cellKeys[problem.problem] }
    : {
        expected: problem.expected,
        found: problem.found,
        key: "Posts.Import.cell.count",
      };
