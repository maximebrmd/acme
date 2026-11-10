import { assert, describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem, Path, Ref, Schema } from "effect";

import { jsonText } from "#json.ts";
import { printable } from "#print.ts";
import { credentialsOf } from "#session.ts";

import { filesLayer, signedIn, testNow } from "./signed-in.ts";
import type { SignedIn } from "./signed-in.ts";
import {
  blueskyId,
  draftId,
  finishedId,
  mastodonId,
  readyMediaId,
  scheduledId,
  youtubeId,
} from "./studio.ts";
import type { Studio } from "./studio.ts";
import { output } from "./support.ts";

// The commands that send posts to the outside world, and the media they
// show, against the in-memory studio: what they ask the server, what
// reaches the media store, what they print, and how they explain a
// refusal.

const stateOf = (studio: Studio) => Ref.get(studio.state);

const changes = (studio: Studio) =>
  stateOf(studio).pipe(Effect.map(({ changes: made }) => made));

const inStudio = ["--workspace", "studio"];

const mastodon = `${mastodonId} (mastodon @studio@example.social)`;

// A sign-in approved before scheduling and publishing had a scope.
const withoutPublishing = "offline_access workspace:read workspace:write";

// What a --json run printed, as a script reads it.
const AnswerSchema = Schema.fromJsonString(
  Schema.Struct({
    content: Schema.optionalKey(Schema.Struct({ text: Schema.String })),
    createdVia: Schema.optionalKey(
      Schema.NullOr(Schema.Struct({ via: Schema.String }))
    ),
    id: Schema.optionalKey(Schema.String),
    items: Schema.optionalKey(
      Schema.Array(Schema.Struct({ id: Schema.String }))
    ),
    nextCursor: Schema.optionalKey(Schema.NullOr(Schema.String)),
    schedule: Schema.optionalKey(
      Schema.NullOr(
        Schema.Struct({ at: Schema.String, timeZone: Schema.String })
      )
    ),
    scheduledVia: Schema.optionalKey(
      Schema.NullOr(Schema.Struct({ name: Schema.NullOr(Schema.String) }))
    ),
    status: Schema.optionalKey(Schema.Unknown),
  })
);

const answerOf = Schema.decodeUnknownSync(AnswerSchema);

const ListSchema = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ id: Schema.String, platform: Schema.String }))
);

const listOf = Schema.decodeUnknownSync(ListSchema);

const backslash = String.fromCodePoint(0x5c);

const textOf = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ text: Schema.String }))
);

// A file of the test's own, with `byteSize` bytes in it.
const fileOf = (session: SignedIn, name: string, byteSize: number) =>
  Effect.gen(function* writing() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = path.join(session.directory, name);

    yield* fs.writeFile(file, new Uint8Array(byteSize).fill(7));

    return file;
  });

// peal posts schedule, for the draft.
const scheduleDraft = (...rest: readonly string[]) => [
  "posts",
  "schedule",
  draftId,
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

// peal post, now, under one idempotency key.
const keyed = (text: string) => [
  "post",
  text,
  "--channel",
  mastodonId,
  "--now",
  "--idempotency-key",
  "synthetic-key-1",
  ...inStudio,
];

const importing = (address: string) => [
  "media",
  "import",
  address,
  ...inStudio,
];

const idIn = (printed: string): string =>
  /post (?<id>[\da-f-]{36})/u.exec(printed)?.groups?.["id"] ?? "";

describe("peal posts schedule, publish, reschedule and cancel", () => {
  it.effect(
    "schedules a draft on the channels it has, at a local time read in the zone",
    () =>
      Effect.gen(function* schedules() {
        const session = yield* signedIn();

        assert.include(
          yield* session.printed([
            "posts",
            "schedule",
            draftId,
            "--at",
            "2026-11-20T10:00",
            "--zone",
            "Europe/Paris",
            ...inStudio,
          ]),
          `Scheduled post ${draftId} for 2026-11-20T09:00:00Z (Europe/Paris) on ${mastodon}`
        );
        assert.deepStrictEqual(yield* changes(session.studio), [
          `reschedule:${draftId}:2026-11-20T09:00:00.000Z:Europe/Paris`,
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "schedules a draft on the channels named, in the zone TZ gives, and takes an instant with its offset",
    () =>
      Effect.gen(function* schedules() {
        const session = yield* signedIn();

        yield* session.printed([
          "posts",
          "schedule",
          draftId,
          "--at",
          "2026-11-20T10:00:00+01:00",
          "--channels",
          `${mastodonId},${blueskyId}`,
          ...inStudio,
        ]);

        assert.deepStrictEqual(yield* changes(session.studio), [
          `schedule:${draftId}:2026-11-20T09:00:00.000Z:Europe/Paris:${mastodonId}+${blueskyId}`,
        ]);

        const other = yield* signedIn();

        yield* other.printed([
          "posts",
          "schedule",
          draftId,
          "--at",
          "2026-11-20T09:00:00Z",
          "--time-zone",
          "America/New_York",
          "--channel",
          mastodonId,
          "--channel",
          blueskyId,
          ...inStudio,
        ]);

        assert.deepStrictEqual(yield* changes(other.studio), [
          `schedule:${draftId}:2026-11-20T09:00:00.000Z:America/New_York:${mastodonId}+${blueskyId}`,
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "refuses a time it cannot read before asking the server anything",
    () =>
      Effect.gen(function* refuses() {
        const session = yield* signedIn();

        assert.include(
          yield* session.refused(scheduleDraft("--at", "tomorrow")),
          "--at takes an instant with its offset"
        );
        // The clocks skip 02:30 in Paris on 29 March 2026.
        assert.include(
          yield* session.refused(
            scheduleDraft("--at", "2026-03-29T02:30", "--zone", "Europe/Paris")
          ),
          "the clocks skip or repeat it there"
        );
        assert.include(
          yield* session.refused(
            scheduleDraft("--at", "2026-11-20T10:00", "--zone", "Mars/Olympus")
          ),
          "Mars/Olympus is not a time zone this machine knows"
        );
        assert.deepStrictEqual(yield* changes(session.studio), []);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains a time that has passed, and a zone Peal refuses", () =>
    Effect.gen(function* explains() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "posts",
          "schedule",
          draftId,
          "--at",
          "2026-11-01T09:00:00Z",
          ...inStudio,
        ]),
        "That time has passed: give a later --at, or publish it now."
      );
      assert.include(
        yield* session.refused([
          "posts",
          "reschedule",
          scheduledId,
          "--at",
          "2026-11-21T09:00:00Z",
          "--zone",
          "Mars/Olympus",
          ...inStudio,
        ]),
        "Mars/Olympus is not a time zone Peal knows"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("publishes a draft now, on the channels it has", () =>
    Effect.gen(function* publishes() {
      const session = yield* signedIn();

      const printed = yield* session.printed([
        "posts",
        "publish",
        draftId,
        ...inStudio,
      ]);

      assert.include(
        printed,
        `Publishing post ${draftId} now on ${mastodon}: it cannot be taken back from here once it is out.`
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        // The sign-in took five seconds of the test's clock.
        `reschedule:${draftId}:2026-11-09T12:00:05.000Z:Europe/Paris`,
      ]);

      const { posts } = yield* stateOf(session.studio);

      assert.strictEqual(
        posts.find(({ id }) => id === draftId)?.status,
        "publishing"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("moves a scheduled post, and nothing that went out", () =>
    Effect.gen(function* moves() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed([
          "posts",
          "reschedule",
          scheduledId,
          "--at",
          "2026-11-21T18:30",
          ...inStudio,
        ]),
        `Moved post ${scheduledId} to 2026-11-21T17:30:00Z (Europe/Paris), on ${mastodon}.`
      );
      assert.include(
        yield* session.refused([
          "posts",
          "reschedule",
          finishedId,
          "--at",
          "2026-11-21T18:30",
          ...inStudio,
        ]),
        "The post is finished, which does not allow this."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("cancels a scheduled post, once", () =>
    Effect.gen(function* cancels() {
      const session = yield* signedIn();
      const args = ["posts", "cancel", scheduledId, ...inStudio];

      assert.include(
        yield* session.printed(args),
        `Cancelled post ${scheduledId}: it goes out on no channel.`
      );
      assert.include(
        yield* session.refused(args),
        "The post is cancelled, which does not allow this."
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `cancel:${scheduledId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "lists every violation of a draft, with its channel and field",
    () =>
      Effect.gen(function* violations() {
        const session = yield* signedIn();

        const refused = yield* session.refused([
          "posts",
          "schedule",
          draftId,
          "--at",
          "2026-11-20T09:00:00Z",
          "--channels",
          `${mastodonId},${youtubeId}`,
          ...inStudio,
        ]);

        assert.include(refused, "Peal refused the post, and made nothing:");
        assert.include(
          refused,
          `optionMissing on channel ${youtubeId} (youtube), option title: the platform needs this option, and the post has none`
        );
        assert.deepStrictEqual(yield* changes(session.studio), []);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("a sign-in without the permission to schedule and publish", () => {
  it.effect(
    "is told to sign in again by every command that sends, moves or stops a post, and still writes drafts",
    () =>
      Effect.gen(function* unscoped() {
        const session = yield* signedIn({ scope: withoutPublishing });

        const again =
          "This sign-in was made without the permission to schedule and publish posts: run peal login again and approve it.";

        const refusals = [
          ["posts", "schedule", draftId, "--at", "2026-11-20T09:00:00Z"],
          ["posts", "publish", draftId],
          ["posts", "reschedule", scheduledId, "--at", "2026-11-20T09:00:00Z"],
          ["posts", "cancel", scheduledId],
          ["posts", "unschedule", scheduledId],
          ["post", "A synthetic note", "--channel", mastodonId, "--now"],
        ];

        for (const args of refusals) {
          assert.include(yield* session.refused([...args, ...inStudio]), again);
        }

        assert.include(
          yield* session.printed([
            "drafts",
            "save",
            "--text",
            "A synthetic draft",
            ...inStudio,
          ]),
          "Saved draft"
        );

        const made = yield* changes(session.studio);

        assert.strictEqual(made.length, 1);
        assert.match(made[0] ?? "", /^create:/u);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it("keeps the scopes it asked for when the server's answer names none", () => {
    const token = {
      access_token: "synthetic-access",
      expires_in: 900,
      token_type: "Bearer",
    };

    expect(credentialsOf(token, testNow, withoutPublishing).scope).toBe(
      withoutPublishing
    );
    expect(
      credentialsOf({ ...token, scope: "workspace:read" }, testNow, "").scope
    ).toBe("workspace:read");
  });

  it.effect("is told its role is why, when it has the permission", () =>
    Effect.gen(function* viewer() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "post",
          "A synthetic note",
          "--channel",
          mastodonId,
          "--now",
          "--workspace",
          "shop",
        ]),
        "Peal refused: your role in this workspace does not allow it"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal post", () => {
  it.effect(
    "sends nothing unless told when: publishing is never the default",
    () =>
      Effect.gen(function* refuses() {
        const session = yield* signedIn();
        const file = yield* fileOf(session, "cover.png", 12);

        assert.include(
          yield* session.refused(
            note("--channel", mastodonId, "--media", file)
          ),
          "Say when it goes out: --at <instant> to schedule it, or --now to publish it now. Publishing is never the default."
        );
        assert.include(
          yield* session.refused(
            note(
              "--channel",
              mastodonId,
              "--now",
              "--at",
              "2026-11-20T09:00:00Z"
            )
          ),
          "Give --at or --now, not both."
        );
        assert.include(
          yield* session.refused(note("--now")),
          "Name the channels it goes to with --channel"
        );
        assert.include(
          yield* session.refused(
            note("--channel", mastodonId, "--now", "--alt", "A cover")
          ),
          "There are more --alt than --media"
        );
        assert.include(
          yield* session.refused(
            note("--channel", mastodonId, "--now", "--idempotency-key", "")
          ),
          "--idempotency-key takes 1 to 255 characters."
        );

        const state = yield* stateOf(session.studio);

        assert.deepStrictEqual(state.changes, []);
        assert.deepStrictEqual(state.stored, []);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("publishes now, and says where it goes", () =>
    Effect.gen(function* publishes() {
      const session = yield* signedIn();

      const printed = yield* session.printed([
        "post",
        "A synthetic launch note",
        "--channels",
        mastodonId,
        "--now",
        ...inStudio,
      ]);

      const id = idIn(printed);

      assert.include(printed, `Publishing now on ${mastodon}: post ${id}.`);
      assert.include(printed, "cannot be taken back from here once it is out");
      assert.deepStrictEqual(yield* changes(session.studio), [
        `send:${id}:now:no key`,
      ]);

      const { posts } = yield* stateOf(session.studio);
      const sent = posts.find((found) => found.id === id);

      assert.strictEqual(sent?.status, "publishing");
      assert.strictEqual(sent?.content.text, "A synthetic launch note");
      assert.strictEqual(sent?.schedule?.timeZone, "Europe/Paris");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "schedules a post with a file it uploads, an address the server imports and a media the workspace has",
    () =>
      Effect.gen(function* schedules() {
        const session = yield* signedIn();
        const file = yield* fileOf(session, "cover.PNG", 12);

        const printed = yield* session.printed([
          "post",
          "A synthetic catalogue note",
          "--channel",
          mastodonId,
          "--at",
          "2026-11-20T10:00",
          "--media",
          file,
          "--alt",
          "A synthetic cover",
          "--media",
          "https://files.example.test/banner.png",
          "--alt",
          "A synthetic banner",
          "--media",
          readyMediaId,
          ...inStudio,
        ]);

        const id = idIn(printed);

        assert.include(
          printed,
          `Scheduled for 2026-11-20T09:00:00Z (Europe/Paris) on ${mastodon}: post ${id}.`
        );
        assert.include(printed, `peal posts cancel ${id} stops it`);

        const state = yield* stateOf(session.studio);

        const attachments = state.posts
          .filter((found) => found.id === id)
          .flatMap(({ content }) => content.media);

        const [uploaded, imported] = attachments.map(({ mediaId }) => mediaId);

        assert.deepStrictEqual(attachments, [
          { altText: "A synthetic cover", mediaId: String(uploaded) },
          { altText: "A synthetic banner", mediaId: String(imported) },
          { altText: "", mediaId: readyMediaId },
        ]);
        assert.deepStrictEqual(state.changes, [
          `upload:${String(uploaded)}:image/png`,
          `complete:${String(uploaded)}`,
          `import:${String(imported)}:https://files.example.test/banner.png`,
          `send:${id}:at:no key`,
        ]);

        // The file went to the store whole, with the signed headers, and
        // without the sign-in, which is for the API alone.
        assert.deepStrictEqual(
          state.stored.map(({ byteSize, mediaId, method, part }) => ({
            byteSize,
            mediaId,
            method,
            part,
          })),
          [
            {
              byteSize: 12,
              mediaId: String(uploaded),
              method: "PUT",
              part: null,
            },
          ]
        );

        const headers = new Map(
          state.stored.flatMap(({ headers: sentWith }) =>
            Object.entries(sentWith)
          )
        );

        assert.strictEqual(headers.get("content-type"), "image/png");
        assert.strictEqual(headers.get("if-none-match"), "*");
        assert.isFalse(headers.has("authorization"));
        assert.isFalse(headers.has("traceparent"));
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "answers the same post under the same idempotency key, and refuses the key for another",
    () =>
      Effect.gen(function* idempotent() {
        const session = yield* signedIn();

        const first = idIn(yield* session.printed(keyed("A synthetic note")));
        const second = idIn(yield* session.printed(keyed("A synthetic note")));

        assert.strictEqual(second, first);
        assert.include(
          yield* session.refused(keyed("Another synthetic note")),
          "This idempotency key was sent in the last 24 hours with another post: nothing was made."
        );
        assert.deepStrictEqual(yield* changes(session.studio), [
          `send:${first}:now:synthetic-key-1`,
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "refuses the same post sent twice without a key, unless --allow-duplicate",
    () =>
      Effect.gen(function* duplicates() {
        const session = yield* signedIn();
        const twice = note("--channel", mastodonId, "--now");

        const first = idIn(yield* session.printed(twice));
        const refused = yield* session.refused(twice);

        assert.include(
          refused,
          `The same content already goes to channel ${mastodonId} (post ${first}), less than 23 hours from this post's time: nothing was made.`
        );
        assert.include(refused, "--allow-duplicate");

        const second = idIn(
          yield* session.printed([...twice, "--allow-duplicate"])
        );

        assert.notStrictEqual(second, first);
        assert.deepStrictEqual(yield* changes(session.studio), [
          `send:${first}:now:no key`,
          `send:${second}:now:no key`,
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "lists every violation at once, with its channel and field, and makes nothing",
    () =>
      Effect.gen(function* violations() {
        const session = yield* signedIn();

        const refused = yield* session.refused([
          "post",
          "a".repeat(501),
          "--channels",
          `${mastodonId},${youtubeId}`,
          "--now",
          ...inStudio,
        ]);

        assert.include(refused, "Peal refused the post, and made nothing:");
        assert.include(
          refused,
          `textTooLong on channel ${mastodonId} (mastodon): the text has 501 UTF-16 units, and the platform takes 500`
        );
        assert.include(
          refused,
          `optionMissing on channel ${youtubeId} (youtube), option title:`
        );
        assert.deepStrictEqual(yield* changes(session.studio), []);

        // With the option the platform asks for, it goes.
        assert.include(
          yield* session.printed([
            "post",
            "A synthetic video note",
            "--channel",
            youtubeId,
            "--now",
            "--options",
            `${youtubeId}={"platform":"youtube","title":"A synthetic title"}`,
            ...inStudio,
          ]),
          "Publishing now on"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains channels and media the workspace does not have", () =>
    Effect.gen(function* unknown() {
      const session = yield* signedIn();
      const stranger = "0190f3a0-0000-7000-8000-00000000ffff";

      assert.include(
        yield* session.refused([
          "post",
          "A synthetic note",
          "--channel",
          stranger,
          "--now",
          ...inStudio,
        ]),
        `These channels are not the workspace's: ${stranger}.`
      );
      assert.include(
        yield* session.refused([
          "post",
          "A synthetic note",
          "--channel",
          mastodonId,
          "--now",
          "--media",
          stranger,
          ...inStudio,
        ]),
        `These media are not the workspace's, or not ready: ${stranger}.`
      );
      assert.include(
        yield* session.refused([
          "post",
          `A synthetic ${String.fromCodePoint(0)} character`,
          "--channel",
          mastodonId,
          "--now",
          ...inStudio,
        ]),
        "The post does not fit"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "prints the API's post as one JSON document, which a terminal never acts on and a parser reads back whole",
    () =>
      Effect.gen(function* json() {
        const session = yield* signedIn();
        const escape = String.fromCodePoint(0x1b);

        const hostile = [
          "Launch",
          `${escape}[2J`,
          `${String.fromCodePoint(0x9b)}31m`,
          `${String.fromCodePoint(0x20_2e)}day`,
        ].join("");

        const printed = yield* session.printed([
          "post",
          hostile,
          "--channel",
          mastodonId,
          "--at",
          "2026-11-20T10:00",
          "--json",
          ...inStudio,
        ]);

        const answer = answerOf(printed);

        assert.strictEqual(printed, printable(printed));
        assert.notInclude(printed, escape);
        assert.strictEqual(answer.content?.text, hostile);
        assert.strictEqual(answer.status, "scheduled");
        assert.deepStrictEqual(answer.schedule, {
          at: "2026-11-20T09:00:00.000Z",
          timeZone: "Europe/Paris",
        });
        assert.strictEqual(answer.createdVia?.via, "application");
        assert.strictEqual(answer.scheduledVia?.name, "Peal CLI");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal media", () => {
  it.effect("uploads an image in one request, and a video in parts", () =>
    Effect.gen(function* uploads() {
      const session = yield* signedIn();
      const cover = yield* fileOf(session, "cover.jpg", 9);
      const clip = yield* fileOf(session, "clip.mp4", 10);

      const printed = yield* session.printed([
        "media",
        "upload",
        cover,
        "--alt",
        "A synthetic cover",
        ...inStudio,
      ]);

      assert.match(
        printed,
        /Stored .*cover\.jpg as media [\da-f-]{36} in Studio \(image\/jpeg, 9 bytes\): ready\./u
      );

      const uploaded = answerOf(
        yield* session.printed(["media", "upload", clip, "--json", ...inStudio])
      );

      assert.deepStrictEqual(uploaded.status, { _tag: "ready" });

      const state = yield* stateOf(session.studio);

      assert.strictEqual(
        state.media.find(({ contentType }) => contentType === "image/jpeg")
          ?.altText,
        "A synthetic cover"
      );
      assert.deepStrictEqual(
        state.stored
          .filter(({ mediaId }) => mediaId === uploaded.id)
          .map(({ byteSize, part }) => [part, byteSize]),
        [
          ["1", 4],
          ["2", 4],
          ["3", 2],
        ]
      );
      assert.deepStrictEqual(
        state.changes.at(-1),
        `complete:${uploaded.id ?? ""}`
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "leaves no pending media when the store refuses the file, and never prints the signed address",
    () =>
      Effect.gen(function* refusedByStore() {
        const session = yield* signedIn();
        const cover = yield* fileOf(session, "cover.png", 9);

        yield* Ref.update(session.studio.state, (current) => ({
          ...current,
          storeStatus: 412,
        }));

        const refused = yield* session.refused([
          "media",
          "upload",
          cover,
          ...inStudio,
        ]);

        assert.include(
          refused,
          "The media store refused the file (HTTP 412): nothing was stored."
        );
        assert.notInclude(refused, "signature");

        const state = yield* stateOf(session.studio);

        assert.strictEqual(state.media.length, 1);
        assert.match(state.changes.at(-1) ?? "", /^delete-media:/u);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a file it cannot send before asking the server", () =>
    Effect.gen(function* refuses() {
      const session = yield* signedIn();
      const notes = yield* fileOf(session, "notes.txt", 9);
      const empty = yield* fileOf(session, "empty.png", 0);

      assert.include(
        yield* session.refused(["media", "upload", notes, ...inStudio]),
        "is not a file Peal takes, by its name"
      );
      assert.include(
        yield* session.refused(["media", "upload", empty, ...inStudio]),
        "is not a file with something in it."
      );
      assert.include(
        yield* session.refused([
          "media",
          "upload",
          `${session.directory}/missing.png`,
          ...inStudio,
        ]),
        "Cannot read"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("imports from an address, and explains each refusal", () =>
    Effect.gen(function* imports() {
      const session = yield* signedIn();

      assert.match(
        yield* session.printed(
          importing("https://files.example.test/banner.png")
        ),
        /Stored https:\/\/files\.example\.test\/banner\.png as media [\da-f-]{36} in Studio \(image\/png, 2048 bytes\): ready\./u
      );
      assert.include(
        yield* session.refused(
          importing("https://intranet.example.test/banner.png")
        ),
        "Peal does not fetch this address: it takes https URLs on the default port whose host is public"
      );
      assert.include(
        yield* session.refused(
          importing("https://slow.example.test/banner.png")
        ),
        "Peal could not fetch the file: the file did not arrive within 90 seconds: download it, then upload it with peal media upload. Nothing was stored."
      );
      assert.include(
        yield* session.refused(
          importing("https://files.example.test/missing.png")
        ),
        "its host answered something else than the file (HTTP 404)"
      );
      assert.include(
        yield* session.refused(
          importing("https://files.example.test/catalogue.pdf")
        ),
        "Peal does not store application/pdf files"
      );
      assert.include(
        yield* session.refused([
          "media",
          "import",
          "https://files.example.test/banner.png",
          "--workspace",
          "shop",
        ]),
        "Peal refused: your role in this workspace does not allow it"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the workspace's media, a page at a time", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      yield* session.printed([
        "media",
        "import",
        "https://files.example.test/banner.png",
        ...inStudio,
      ]);

      const listed = yield* session.printed([
        "media",
        "list",
        "--limit",
        "1",
        ...inStudio,
      ]);

      assert.include(listed, "Media of Studio, newest first:");
      assert.match(listed, /image\/png\s+2048 bytes\s+ready/u);
      assert.match(
        listed,
        /More: peal media list --workspace studio --cursor [\da-f-]{36}/u
      );

      const page = answerOf(
        yield* session.printed(["media", "list", "--json", ...inStudio])
      );

      assert.strictEqual(page.items?.length, 2);
      assert.strictEqual(page.items?.[1]?.id, readyMediaId);
      assert.isNull(page.nextCursor);
      assert.include(
        yield* session.printed(["media", "list", "--workspace", "shop"]),
        "Shop has no media."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("--json", () => {
  it.effect(
    "prints the API's answer alone for posts, drafts and channels",
    () =>
      Effect.gen(function* json() {
        const session = yield* signedIn();

        const shown = answerOf(
          yield* session.printed([
            "posts",
            "show",
            scheduledId,
            "--json",
            ...inStudio,
          ])
        );

        assert.strictEqual(shown.id, scheduledId);
        assert.strictEqual(shown.schedule?.at, "2026-11-20T09:00:00.000Z");

        const moved = answerOf(
          yield* session.printed([
            "posts",
            "reschedule",
            scheduledId,
            "--at",
            "2026-11-21T09:00:00Z",
            "--json",
            ...inStudio,
          ])
        );

        assert.strictEqual(moved.schedule?.at, "2026-11-21T09:00:00.000Z");
        assert.strictEqual(moved.scheduledVia?.name, "Peal CLI");

        const published = answerOf(
          yield* session.printed([
            "posts",
            "publish",
            draftId,
            "--json",
            ...inStudio,
          ])
        );

        assert.strictEqual(published.status, "publishing");

        const cancelled = answerOf(
          yield* session.printed([
            "posts",
            "cancel",
            scheduledId,
            "--json",
            ...inStudio,
          ])
        );

        assert.strictEqual(cancelled.status, "cancelled");

        const saved = answerOf(
          yield* session.printed([
            "drafts",
            "save",
            "--text",
            "A synthetic draft",
            "--json",
            ...inStudio,
          ])
        );

        assert.strictEqual(saved.status, "draft");

        const drafts = answerOf(
          yield* session.printed(["drafts", "list", "--json", ...inStudio])
        );

        assert.deepStrictEqual(
          drafts.items?.map(({ id }) => id),
          [saved.id ?? ""]
        );
        assert.isNull(drafts.nextCursor);

        const channels = listOf(
          yield* session.printed(["channels", "list", "--json", ...inStudio])
        );

        assert.strictEqual(channels.length, 5);
        assert.deepStrictEqual(channels[0], {
          id: mastodonId,
          platform: "mastodon",
        });
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("keeps a refusal on stderr, and stdout empty", () =>
    Effect.gen(function* refusal() {
      const session = yield* signedIn();

      const before = (yield* output).logs.length;

      assert.include(
        yield* session.refused([
          "posts",
          "show",
          "0190f3a0-0000-7000-8000-00000000ffff",
          "--json",
          ...inStudio,
        ]),
        "The workspace has no such post."
      );
      assert.strictEqual((yield* output).logs.length, before);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it("escapes what a terminal would act on, as JSON reads it back", () => {
    const hostile = `a${String.fromCodePoint(0x7f)}b${String.fromCodePoint(0x9b)}c${String.fromCodePoint(0x20_2e)}d${String.fromCodePoint(0x1b)}e`;
    const text = jsonText(JSON.stringify({ text: hostile }));

    expect(text).toBe(printable(text));
    expect(text).toContain(
      ["a", "007fb", "009bc", "202ed", "001be"].join(`${backslash}u`)
    );
    expect(textOf(text)).toStrictEqual({ text: hostile });
  });
});
