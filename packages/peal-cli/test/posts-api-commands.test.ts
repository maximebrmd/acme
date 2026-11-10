import { assert, describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem, Path, Ref, Schema } from "effect";
import { ImportUnreadable, InvalidTimeRange } from "peal-contract";
import type { PostValidation } from "peal-contract";

import { explain } from "#explain.ts";
import { problemsOf } from "#post-check.ts";

import { filesLayer, signedIn } from "./signed-in.ts";
import type { SignedIn } from "./signed-in.ts";
import {
  blueskyId,
  draftId,
  finishedId,
  mastodonId,
  readyMediaId,
  scheduledId,
  userId,
  youtubeId,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

// The commands over the posting API's later endpoints, against the
// in-memory studio: listing posts by filter, checking a post without
// making it, waiting for how it went, and importing a file of posts.

const stateOf = (studio: Studio) => Ref.get(studio.state);

const changes = (studio: Studio) =>
  stateOf(studio).pipe(Effect.map(({ changes: made }) => made));

const inStudio = ["--workspace", "studio"];

const stranger = "0190f3a0-0000-7000-8000-00000000ffff";

// A sign-in approved before scheduling and publishing had a scope.
const withoutPublishing = "offline_access workspace:read workspace:write";

const listing = (...rest: readonly string[]) => [
  "posts",
  "list",
  ...rest,
  ...inStudio,
];

// peal post, for a note.
const note = (...rest: readonly string[]) => [
  "post",
  "A synthetic note",
  ...rest,
  ...inStudio,
];

const idIn = (printed: string): string =>
  /post (?<id>[\da-f-]{36})/u.exec(printed)?.groups?.["id"] ?? "";

// The lines that name a post, in the order printed.
const idsIn = (printed: string): string[] =>
  [...printed.matchAll(/^ {2}(?<id>[\da-f-]{36})/gmu)].map(
    (match) => match.groups?.["id"] ?? ""
  );

const PageSchema = Schema.fromJsonString(
  Schema.Struct({
    channels: Schema.Array(
      Schema.Struct({ channelId: Schema.String, platform: Schema.String })
    ),
    items: Schema.Array(Schema.Struct({ id: Schema.String })),
    nextCursor: Schema.NullOr(Schema.String),
  })
);

const pageOf = Schema.decodeUnknownSync(PageSchema);

const ValidationSchema = Schema.fromJsonString(
  Schema.Struct({
    channels: Schema.Array(
      Schema.Struct({ channelId: Schema.String, text: Schema.String })
    ),
    valid: Schema.Boolean,
  })
);

const validationOf = Schema.decodeUnknownSync(ValidationSchema);

const PostAnswerSchema = Schema.fromJsonString(
  Schema.Struct({
    id: Schema.String,
    outcome: Schema.NullOr(Schema.String),
    status: Schema.String,
  })
);

const postOf = Schema.decodeUnknownSync(PostAnswerSchema);

const ImportAnswerSchema = Schema.fromJsonString(
  Schema.Struct({
    created: Schema.Number,
    dryRun: Schema.Boolean,
    rows: Schema.Array(
      Schema.Struct({ _tag: Schema.String, row: Schema.Number })
    ),
  })
);

const importOf = Schema.decodeUnknownSync(ImportAnswerSchema);

// A file of the test's own, holding `contents`.
const fileOf = (session: SignedIn, name: string, contents: string) =>
  Effect.gen(function* writing() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = path.join(session.directory, name);

    yield* fs.writeFileString(file, contents);

    return file;
  });

const twoPosts = [
  "text,channels,at,time_zone",
  `"A synthetic note, with a comma and a ""quote""",${mastodonId},2026-11-20 10:00,Europe/Paris`,
  `Another synthetic note,${mastodonId} ${blueskyId},now,`,
  "",
].join("\n");

const importing = (file: string, ...rest: readonly string[]) => [
  "posts",
  "import",
  file,
  ...rest,
  ...inStudio,
];

const waiting = (id: string) => ["posts", "wait", id, ...inStudio];

const reasonOf = (failure: Parameters<ReturnType<typeof explain>>[0]) => {
  const explained = explain("http://localhost:3000")(failure);

  return explained._tag === "Refused" ? explained.reason : explained._tag;
};

describe("peal posts list", () => {
  it.effect(
    "lists every post with its status or outcome, its time and each channel's platform and status",
    () =>
      Effect.gen(function* lists() {
        const session = yield* signedIn();
        const printed = yield* session.printed(listing());

        assert.include(printed, "Posts of Studio:");
        assert.deepStrictEqual(idsIn(printed), [
          draftId,
          scheduledId,
          finishedId,
        ]);
        assert.match(
          printed,
          new RegExp(
            `${draftId} +draft +no time +mastodon pending +A synthetic draft`,
            "u"
          )
        );
        assert.match(
          printed,
          new RegExp(
            `${finishedId} +failed +2026-11-08T09:00:00Z +mastodon failed, bluesky unconfirmed, youtube failed +A synthetic post`,
            "u"
          )
        );
        assert.notInclude(printed, "--cursor");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("pages with the cursor the page before printed", () =>
    Effect.gen(function* pages() {
      const session = yield* signedIn();
      const first = yield* session.printed(listing("--limit", "2"));

      assert.deepStrictEqual(idsIn(first), [draftId, scheduledId]);
      assert.include(
        first,
        `More: the same command with --cursor ${scheduledId}`
      );

      const second = yield* session.printed(
        listing("--limit", "2", "--cursor", scheduledId)
      );

      assert.deepStrictEqual(idsIn(second), [finishedId]);
      assert.notInclude(second, "More:");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("filters by status, outcome, channel and platform", () =>
    Effect.gen(function* filters() {
      const session = yield* signedIn();

      const listed = (...rest: readonly string[]) =>
        session.printed(listing(...rest)).pipe(Effect.map(idsIn));

      assert.deepStrictEqual(yield* listed("--status", "scheduled"), [
        scheduledId,
      ]);
      assert.deepStrictEqual(yield* listed("--outcome", "failed"), [
        finishedId,
      ]);
      assert.deepStrictEqual(yield* listed("--channel", youtubeId), [
        finishedId,
      ]);
      assert.deepStrictEqual(yield* listed("--platform", "bluesky"), [
        finishedId,
      ]);
      assert.include(
        yield* session.printed(listing("--status", "cancelled")),
        "No post of Studio matches."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "filters by scheduled time, read in the zone, by author and origin, and sorts",
    () =>
      Effect.gen(function* filters() {
        const session = yield* signedIn();

        const listed = (...rest: readonly string[]) =>
          session.printed(listing(...rest)).pipe(Effect.map(idsIn));

        // 10:00 in Paris is 09:00 UTC, the scheduled post's instant: --from
        // includes it, --to does not.
        assert.deepStrictEqual(
          yield* listed("--from", "2026-11-20T10:00", "--zone", "Europe/Paris"),
          [scheduledId]
        );
        assert.deepStrictEqual(yield* listed("--to", "2026-11-20T09:00:00Z"), [
          finishedId,
        ]);
        assert.deepStrictEqual(yield* listed("--sort", "scheduledAsc"), [
          finishedId,
          scheduledId,
        ]);
        assert.deepStrictEqual(yield* listed("--author", stranger), []);

        const sent = idIn(
          yield* session.printed(note("--channel", mastodonId, "--now"))
        );

        assert.deepStrictEqual(
          yield* listed("--created-via", "application", "--author", userId),
          [sent]
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses what it cannot read, and explains the server's", () =>
    Effect.gen(function* refuses() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused(listing("--from", "tomorrow")),
        "--from takes an instant with its offset"
      );
      assert.include(
        yield* session.refused(
          listing(
            "--from",
            "2026-11-21T00:00:00Z",
            "--to",
            "2026-11-20T00:00:00Z"
          )
        ),
        "The range ends before it starts: give a --to later than --from."
      );
      assert.include(
        yield* session.refused(listing("--cursor", "not-a-cursor")),
        "Peal could not read the request."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints the page as the API answers it with --json", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      const page = pageOf(
        yield* session.printed(listing("--limit", "1", "--json"))
      );

      assert.deepStrictEqual(
        page.items.map(({ id }) => id),
        [draftId]
      );
      assert.deepStrictEqual(page.channels, [
        { channelId: mastodonId, platform: "mastodon" },
      ]);
      assert.strictEqual(page.nextCursor, draftId);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal post --dry-run", () => {
  it.effect(
    "checks a post without making it, and says what each channel would receive",
    () =>
      Effect.gen(function* checks() {
        // Checking publishes nothing: a sign-in without that scope may.
        const session = yield* signedIn({ scope: withoutPublishing });

        const printed = yield* session.printed(
          note(
            "--channel",
            mastodonId,
            "--now",
            "--media",
            readyMediaId,
            "--dry-run"
          )
        );

        assert.include(
          printed,
          "Checked, and made nothing: the post would go through."
        );
        assert.match(
          printed,
          new RegExp(
            `${mastodonId} \\(mastodon @studio@example\\.social\\) +16 of 500 characters, 1 of 4 images and videos`,
            "u"
          )
        );
        assert.deepStrictEqual(yield* changes(session.studio), []);
        assert.lengthOf((yield* stateOf(session.studio)).posts, 3);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists every problem at once, and ends as a refusal", () =>
    Effect.gen(function* problems() {
      const session = yield* signedIn();

      const { errors, logs } = yield* session.refusedAfter([
        "post",
        "a".repeat(501),
        "--channels",
        `${mastodonId},${youtubeId},${stranger}`,
        "--media",
        stranger,
        "--at",
        "2026-11-01T09:00:00Z",
        "--dry-run",
        ...inStudio,
      ]);

      assert.include(logs, "501 of 500 characters");
      assert.include(
        errors,
        "Checked, and made nothing: Peal would refuse the post."
      );
      assert.include(
        errors,
        `textTooLong on channel ${mastodonId} (mastodon): the text has 501 UTF-16 units, and the platform takes 500`
      );
      assert.include(
        errors,
        `optionMissing on channel ${youtubeId} (youtube), option title:`
      );
      assert.include(
        errors,
        `These channels are not the workspace's: ${stranger}.`
      );
      assert.include(
        errors,
        `These media are not the workspace's, or not ready: ${stranger}.`
      );
      assert.include(errors, "That time has passed");
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "tells a post another already sends, unless --allow-duplicate",
    () =>
      Effect.gen(function* duplicates() {
        const session = yield* signedIn();
        const once = note("--channel", mastodonId, "--now");
        const first = idIn(yield* session.printed(once));

        assert.include(
          yield* session.refused([...once, "--dry-run"]),
          `The same content already goes to channel ${mastodonId} (post ${first}), less than 23 hours from this post's time. If you mean to post it twice, send it with --allow-duplicate.`
        );
        assert.include(
          yield* session.printed([...once, "--dry-run", "--allow-duplicate"]),
          "the post would go through"
        );
        assert.deepStrictEqual(yield* changes(session.studio), [
          `send:${first}:now:no key`,
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "takes media ids only, and refuses a file or an address before any request",
    () =>
      Effect.gen(function* refuses() {
        const session = yield* signedIn();
        const cover = yield* fileOf(session, "cover.png", "synthetic");

        for (const source of [cover, "https://files.example.test/cover.png"]) {
          assert.include(
            yield* session.refused(
              note(
                "--channel",
                mastodonId,
                "--now",
                "--media",
                source,
                "--dry-run"
              )
            ),
            "With --dry-run, --media takes media ids only"
          );
        }

        assert.include(
          yield* session.refused(
            note("--channel", mastodonId, "--now", "--wait", "5", "--dry-run")
          ),
          "--dry-run makes nothing"
        );

        const { changes: made, media, stored } = yield* stateOf(session.studio);

        assert.deepStrictEqual(made, []);
        assert.lengthOf(media, 1);
        assert.lengthOf(stored, 0);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints the API's answer with --json, valid or not", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      const valid = validationOf(
        yield* session.printed(
          note("--channel", mastodonId, "--now", "--dry-run", "--json")
        )
      );

      assert.isTrue(valid.valid);
      assert.deepStrictEqual(valid.channels, [
        { channelId: mastodonId, text: "A synthetic note" },
      ]);

      const { errors, logs } = yield* session.refusedAfter(
        note("--channel", stranger, "--now", "--dry-run", "--json")
      );

      assert.isFalse(validationOf(logs).valid);
      assert.include(errors, "These channels are not the workspace's");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it("says what a plan lacks, and a zone Peal does not know", () => {
    const validation: PostValidation = {
      channels: [],
      duplicates: [],
      planLimit: {
        allowed: 30,
        billingUrl: "https://peal.example/app/synthetic/billing",
        limit: "scheduledPosts",
        plan: "free",
        planWithRoom: "starter",
        used: 30,
      },
      schedule: "invalidTimeZone",
      unknownChannels: [],
      unknownMedia: [],
      valid: false,
      violations: [{ _tag: "noChannels" }],
    };

    expect(problemsOf(validation, "Mars/Olympus")).toStrictEqual([
      "  noChannels: the post is for no channel",
      "  Mars/Olympus is not a time zone Peal knows: give an IANA zone, such as Europe/Paris.",
      "  The workspace's Free plan allows 30 posts going out a month, and it has 30. The Starter plan has room: an owner or an admin orders it at https://peal.example/app/synthetic/billing",
    ]);
  });
});

describe("peal post --wait and peal posts wait", () => {
  it.effect("waits for the outcome, and says how each channel went", () =>
    Effect.gen(function* waits() {
      const session = yield* signedIn();

      const printed = yield* session.printed(
        note("--channels", `${mastodonId},${blueskyId}`, "--now", "--wait", "5")
      );

      const id = idIn(printed);

      assert.include(printed, `Publishing now on ${mastodonId}`);
      assert.include(
        printed,
        `Post ${id} finished: it went out on some of its channels only.`
      );
      assert.match(
        printed,
        new RegExp(
          `${mastodonId} \\(mastodon @studio@example\\.social\\) +published at https://example\\.social/`,
          "u"
        )
      );
      assert.match(
        printed,
        new RegExp(
          `${blueskyId} \\(bluesky studio\\.example\\.test\\) +failed: tokenExpired \\(the account's authorization stopped working: reconnect it\\)`,
          "u"
        )
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `send:${id}:now:no key`,
        `settle:${id}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "says a post is still going out, and how to wait for the rest",
    () =>
      Effect.gen(function* stillGoing() {
        const session = yield* signedIn();

        const printed = yield* session.printed(
          note("--channel", mastodonId, "--now", "--wait", "0")
        );

        const id = idIn(printed);

        assert.include(
          printed,
          `Post ${id} is still going out: peal posts wait ${id} waits for the rest.`
        );
        assert.match(printed, /still going \(pending\)/u);

        const waited = yield* session.printed([
          "posts",
          "wait",
          id,
          ...inStudio,
        ]);

        assert.include(
          waited,
          `Post ${id} finished: it went out on every channel.`
        );
        assert.include(waited, "published at https://example.social/");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "refuses a wait it cannot keep before asking the server anything",
    () =>
      Effect.gen(function* refuses() {
        const session = yield* signedIn();

        assert.include(
          yield* session.refused(
            note(
              "--channel",
              mastodonId,
              "--at",
              "2026-11-20T10:00",
              "--wait",
              "5"
            )
          ),
          "--wait goes with --now"
        );
        assert.include(
          yield* session.refused(
            note("--channel", mastodonId, "--now", "--wait", "61")
          ),
          "--wait takes 0 to 60 seconds."
        );
        assert.include(
          yield* session.refused([
            "posts",
            "wait",
            finishedId,
            "--seconds",
            "-1",
            ...inStudio,
          ]),
          "--seconds takes 0 to 60 seconds."
        );
        assert.deepStrictEqual(yield* changes(session.studio), []);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "answers at once for a post that went out, is scheduled, or is not there",
    () =>
      Effect.gen(function* answers() {
        const session = yield* signedIn();
        const finished = yield* session.printed(waiting(finishedId));

        assert.include(
          finished,
          `Post ${finishedId} finished: it went out on no channel.`
        );
        assert.include(
          finished,
          "failed: rateLimited (the platform kept limiting Peal, which stopped trying)"
        );
        assert.include(finished, "unconfirmed: noResponse");
        assert.include(
          yield* session.printed(waiting(scheduledId)),
          `Post ${scheduledId} is scheduled for 2026-11-20T09:00:00Z (Europe/Paris): it has not gone out yet.`
        );
        assert.include(
          yield* session.refused(waiting(stranger)),
          "The workspace has no such post."
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints the API's post with --json", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      const sent = postOf(
        yield* session.printed(
          note("--channel", mastodonId, "--now", "--wait", "5", "--json")
        )
      );

      assert.strictEqual(sent.status, "finished");
      assert.strictEqual(sent.outcome, "published");

      const waited = postOf(
        yield* session.printed([
          "posts",
          "wait",
          sent.id,
          "--seconds",
          "0",
          "--json",
          ...inStudio,
        ])
      );

      assert.deepStrictEqual(waited, sent);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal posts import", () => {
  it.effect("checks a file with --dry-run, and makes nothing", () =>
    Effect.gen(function* checks() {
      const session = yield* signedIn();
      const file = yield* fileOf(session, "posts.csv", twoPosts);
      const printed = yield* session.printed(importing(file, "--dry-run"));

      assert.match(printed, /row 1 +valid/u);
      assert.match(printed, /row 2 +valid/u);
      assert.include(
        printed,
        "Checked 2 rows, and made nothing: every row is valid. Run it again without --dry-run to make them."
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("makes a post per row, and says which", () =>
    Effect.gen(function* imports() {
      const session = yield* signedIn();
      const file = yield* fileOf(session, "posts.csv", twoPosts);
      const printed = yield* session.printed(importing(file));
      const ids = [...printed.matchAll(/created +post (?<id>[\da-f-]{36})/gu)];
      const [first, second] = ids.map((match) => match.groups?.["id"] ?? "");

      assert.lengthOf(ids, 2);
      assert.include(printed, "Made 2 posts from 2 rows.");
      assert.deepStrictEqual(yield* changes(session.studio), [
        `send:${first ?? ""}:at:no key`,
        `send:${second ?? ""}:now:no key`,
      ]);

      const { posts } = yield* stateOf(session.studio);
      const made = posts.find(({ id }) => id === first);

      assert.strictEqual(
        made?.content.text,
        'A synthetic note, with a comma and a "quote"'
      );
      assert.strictEqual(made?.schedule?.timeZone, "Europe/Paris");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "prints every row, then ends as a refusal when some cannot be made",
    () =>
      Effect.gen(function* refuses() {
        const session = yield* signedIn();

        const file = yield* fileOf(
          session,
          "posts.csv",
          [
            "text,channels,at,allow_duplicate",
            `A synthetic note,${mastodonId},now,`,
            `A synthetic note,${stranger},now,`,
            `A synthetic note,${mastodonId},2026-11-01T09:00:00Z,`,
            `A synthetic note,,someday,maybe`,
          ].join("\n")
        );

        const { errors, logs } = yield* session.refusedAfter(importing(file));

        assert.match(logs, /row 1 +valid/u);
        assert.match(
          logs,
          new RegExp(
            `row 2 +refused +these channels are not the workspace's: ${stranger}`,
            "u"
          )
        );
        assert.match(logs, /row 3 +refused +its time has passed/u);
        assert.match(
          logs,
          /row 4 +unreadable +channels is missing, at cannot be read, allow_duplicate cannot be read/u
        );
        assert.include(
          errors,
          "3 of 4 rows cannot be made (rows 2, 3, 4), so nothing was made. Correct them, then import the file again."
        );
        assert.deepStrictEqual(yield* changes(session.studio), []);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains a file that is not posts, or cannot be read", () =>
    Effect.gen(function* unreadable() {
      const session = yield* signedIn();

      const wrong = yield* fileOf(
        session,
        "wrong.csv",
        "text,channels,at,colour\n"
      );

      const path = yield* Path.Path;

      assert.include(
        yield* session.refused(importing(wrong)),
        "The file's first line names a column Peal does not know, colour"
      );
      assert.include(
        yield* session.refused(
          importing(path.join(session.directory, "missing.csv"))
        ),
        "Cannot read"
      );
      assert.include(
        yield* session.refused(
          importing(wrong, "--idempotency-key", "k".repeat(256))
        ),
        "--idempotency-key takes 1 to 255 characters."
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "answers the posts a first run made under the same idempotency key",
    () =>
      Effect.gen(function* idempotent() {
        const session = yield* signedIn();
        const file = yield* fileOf(session, "posts.csv", twoPosts);
        const keyed = importing(file, "--idempotency-key", "synthetic-key-1");
        const first = yield* session.printed(keyed);
        const made = yield* changes(session.studio);
        const second = yield* session.printed(keyed);

        assert.lengthOf(made, 2);
        assert.notInclude(first, "made before");
        assert.match(
          second,
          /row 1 +created +post [\da-f-]{36} \(made before, under this idempotency key\)/u
        );
        assert.include(
          second,
          "Made no new post: the 2 rows were made before."
        );
        assert.deepStrictEqual(yield* changes(session.studio), made);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints the API's answer with --json, and needs to publish", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();
      const file = yield* fileOf(session, "posts.csv", twoPosts);

      const answer = importOf(
        yield* session.printed(importing(file, "--dry-run", "--json"))
      );

      assert.deepStrictEqual(answer, {
        created: 0,
        dryRun: true,
        rows: [
          { _tag: "valid", row: 1 },
          { _tag: "valid", row: 2 },
        ],
      });

      const reading = yield* signedIn({ scope: withoutPublishing });

      assert.include(
        yield* reading.refused(importing(file)),
        "This sign-in was made without the permission to schedule and publish posts"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("the later endpoints' refusals, explained", () => {
  it("says why a file cannot be read as posts", () => {
    expect(
      reasonOf(new ImportUnreadable({ column: null, problem: "empty" }))
    ).toBe(
      "The file is empty: its first line names the columns, and each line under it is a post. Nothing was made."
    );
    expect(
      reasonOf(
        new ImportUnreadable({ column: null, problem: "unterminatedQuote" })
      )
    ).toBe(
      'A quoted cell of the file never ends: close it with a double quote, and write a quote inside a cell twice (""). Nothing was made.'
    );
    expect(
      reasonOf(new ImportUnreadable({ column: "at", problem: "missingColumn" }))
    ).toBe(
      "The file's first line lacks a column it needs, at: text, channels and at are required. Nothing was made."
    );
    expect(
      reasonOf(
        new ImportUnreadable({ column: "text", problem: "repeatedColumn" })
      )
    ).toBe(
      "The file's first line names a column twice, text. Nothing was made."
    );
    expect(
      reasonOf(new ImportUnreadable({ column: null, problem: "tooManyRows" }))
    ).toBe(
      "The file has more than 100 rows under its first line, the most one import takes: split it. Nothing was made."
    );
  });

  it("says a range of times ends before it starts", () => {
    expect(reasonOf(new InvalidTimeRange())).toBe(
      "The range ends before it starts: give a --to later than --from."
    );
  });
});
