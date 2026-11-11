import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";
import { ChannelSchema, PostSchema } from "peal-contract";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  blueskyId,
  campaignTagId,
  draftId,
  finishedId,
  goneChannelId,
  mastodonId,
  scheduledId,
  tiktokId,
  youtubeId,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

// Keeping a workspace's channels in order (their names, turning them off
// and on, finding them) and duplicating a post, against the in-memory
// studio: what each command asks the server, what it prints, and how it
// explains a refusal.

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const inStudio = ["--workspace", "studio"];

const parsed = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown));

const channelOf = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.toCodecJson(ChannelSchema))
);

const postOf = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.toCodecJson(PostSchema))
);

const PageSchema = Schema.fromJsonString(
  Schema.Struct({
    counts: Schema.Struct({
      active: Schema.Number,
      disabled: Schema.Number,
      refreshNeeded: Schema.Number,
    }),
    items: Schema.Array(Schema.Struct({ id: Schema.String })),
    nextCursor: Schema.NullOr(Schema.String),
  })
);

const pageOf = Schema.decodeUnknownSync(PageSchema);

const ErrorSchema = Schema.fromJsonString(
  Schema.Struct({ error: Schema.Record(Schema.String, Schema.Unknown) })
);

const errorOf = (text: string) =>
  Schema.decodeUnknownSync(ErrorSchema)(text).error;

const newPostId = "0190f3a0-0000-7000-8000-000000000005";

describe("peal channels rename", () => {
  it.effect("names a channel, beside its handle, and takes the name back", () =>
    Effect.gen(function* renames() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "channels",
          "rename",
          mastodonId,
          "  Head office ",
          ...inStudio,
        ]),
        `Channel ${mastodonId} of Studio is now called Head office, beside mastodon @studio@social.example.test. The name is Peal's own: nothing changes on the platform.`
      );

      // The list shows the name first, and the handle still.
      assert.match(
        yield* session.printed(["channels", "list", ...inStudio]),
        new RegExp(
          `${mastodonId}\\s+mastodon\\s+Head office \\(@studio@social\\.example\\.test\\)\\s+posts`,
          "u"
        )
      );

      const renamed = channelOf(
        yield* session.printed([
          "channels",
          "rename",
          youtubeId,
          "Films",
          "--json",
          ...inStudio,
        ])
      );

      assert.strictEqual(renamed.id, youtubeId);
      assert.strictEqual(renamed.label, "Films");

      assert.strictEqual(
        yield* session.printed(["channels", "rename", mastodonId, ...inStudio]),
        `Channel ${mastodonId} of Studio has no name of the workspace's any more: it is shown as mastodon @studio@social.example.test.`
      );
      assert.isNull(
        channelOf(
          yield* session.printed([
            "channels",
            "rename",
            youtubeId,
            "--clear",
            "--json",
            ...inStudio,
          ])
        ).label
      );
      // A channel without a name stays so, and nothing is written.
      yield* session.printed(["channels", "rename", youtubeId, ...inStudio]);

      assert.deepStrictEqual(yield* changes(session.studio), [
        `channel:rename:${mastodonId}`,
        `channel:rename:${youtubeId}`,
        `channel:rename:${mastodonId}`,
        `channel:rename:${youtubeId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a name that does not fit, before asking", () =>
    Effect.gen(function* misfit() {
      const session = yield* signedIn();

      for (const name of ["   ", "x".repeat(61), "two\nlines"]) {
        assert.include(
          yield* session.refused([
            "channels",
            "rename",
            mastodonId,
            name,
            ...inStudio,
          ]),
          "A channel's name has 1 to 60 characters, on one line."
        );
      }

      assert.include(
        yield* session.refused([
          "channels",
          "rename",
          mastodonId,
          "Head office",
          "--clear",
          ...inStudio,
        ]),
        "Give a name, or --clear to take the channel's name back: not both."
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal channels disable and enable", () => {
  it.effect("turns a channel off, and back on, saying what it means", () =>
    Effect.gen(function* switches() {
      const session = yield* signedIn();

      const off = yield* session.printed([
        "channels",
        "disable",
        mastodonId,
        ...inStudio,
      ]);

      assert.include(
        off,
        `Channel ${mastodonId} (mastodon @studio@social.example.test) of Studio is turned off: nothing goes out on it.`
      );
      assert.include(
        off,
        "A post that reaches its time meanwhile fails on this channel"
      );
      assert.include(
        off,
        `peal channels enable ${mastodonId} turns it back on`
      );
      assert.match(
        yield* session.printed(["channels", "list", ...inStudio]),
        new RegExp(`${mastodonId}\\s+mastodon\\s+\\S+\\s+turned off`, "u")
      );

      // Again changes nothing more.
      assert.deepStrictEqual(
        channelOf(
          yield* session.printed([
            "channels",
            "disable",
            mastodonId,
            "--json",
            ...inStudio,
          ])
        ).status,
        { _tag: "disabled", refreshNeeded: false }
      );

      assert.strictEqual(
        yield* session.printed(["channels", "enable", mastodonId, ...inStudio]),
        `Channel ${mastodonId} (mastodon @studio@social.example.test) of Studio is turned back on: posts go out on it again. Posts that failed while it was off are not sent: schedule them anew.`
      );
      assert.deepStrictEqual(
        channelOf(
          yield* session.printed([
            "channels",
            "enable",
            mastodonId,
            "--json",
            ...inStudio,
          ])
        ).status,
        { _tag: "active" }
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `channel:disable:${mastodonId}`,
        `channel:enable:${mastodonId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says a channel turned back on must be reconnected", () =>
    Effect.gen(function* stale() {
      const session = yield* signedIn();

      assert.deepStrictEqual(
        channelOf(
          yield* session.printed([
            "channels",
            "disable",
            blueskyId,
            "--json",
            ...inStudio,
          ])
        ).status,
        { _tag: "disabled", refreshNeeded: true }
      );
      assert.match(
        yield* session.printed(["channels", "list", ...inStudio]),
        new RegExp(
          `${blueskyId}\\s+bluesky\\s+\\S+\\s+turned off, and must be reconnected`,
          "u"
        )
      );
      assert.include(
        yield* session.printed(["channels", "enable", blueskyId, ...inStudio]),
        "is turned back on, and must be reconnected before it posts"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("tells a member who may not, and names no channel it has not", () =>
    Effect.gen(function* refusals() {
      const session = yield* signedIn();

      for (const args of [
        ["channels", "rename", mastodonId, "Head office"],
        ["channels", "disable", mastodonId],
        ["channels", "enable", mastodonId],
        ["posts", "duplicate", draftId],
      ]) {
        assert.include(
          yield* session.refused([...args, "--workspace", "shop"]),
          "Peal refused: your role in this workspace does not allow it"
        );
      }

      assert.include(
        yield* session.refused(["channels", "disable", draftId, ...inStudio]),
        "The workspace has no such channel"
      );

      const failure = errorOf(
        yield* session.refused([
          "channels",
          "enable",
          goneChannelId,
          "--json",
          ...inStudio,
        ])
      );

      assert.strictEqual(failure["_tag"], "ChannelNotFound");
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal channels list", () => {
  it.effect("counts the channels by status, and keeps its JSON a list", () =>
    Effect.gen(function* plain() {
      const session = yield* signedIn();
      const listed = yield* session.printed(["channels", "list", ...inStudio]);

      assert.include(listed, "Channels of Studio:");
      assert.include(listed, "In all: 5 post, 0 turned off, 1 to reconnect.");

      // Without a filter or a page, the array scripts know.
      assert.isArray(
        parsed(
          yield* session.printed(["channels", "list", "--json", ...inStudio])
        )
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("narrows to a platform, a status or some text, with counts", () =>
    Effect.gen(function* filters() {
      const session = yield* signedIn();

      yield* session.printed(["channels", "disable", tiktokId, ...inStudio]);
      yield* session.printed([
        "channels",
        "rename",
        youtubeId,
        "Head office films",
        ...inStudio,
      ]);

      const off = yield* session.printed([
        "channels",
        "list",
        "--status",
        "disabled",
        ...inStudio,
      ]);

      assert.include(off, tiktokId);
      assert.notInclude(off, mastodonId);
      // The counts tell of the other statuses too.
      assert.include(off, "In all: 4 post, 1 turned off, 1 to reconnect.");

      // The name the workspace gave, whatever its case.
      const named = yield* session.printed([
        "channels",
        "list",
        "--search",
        " HEAD OFFICE ",
        ...inStudio,
      ]);

      assert.include(named, `${youtubeId}  youtube`);
      assert.include(named, "Head office films (Studio videos)");
      assert.include(
        named,
        "Of those the platform and the text match, whatever their status: 1 post, 0 turned off, 0 to reconnect."
      );

      // Every filter must hold: the TikTok channel is off, so none posts.
      assert.strictEqual(
        yield* session.printed([
          "channels",
          "list",
          "--platform",
          "tiktok",
          "--status",
          "active",
          ...inStudio,
        ]),
        [
          "No channel of Studio matches.",
          "Of those the platform and the text match, whatever their status: 0 post, 1 turned off, 0 to reconnect.",
        ].join("\n")
      );

      assert.deepStrictEqual(
        pageOf(
          yield* session.printed([
            "channels",
            "list",
            "--platform",
            "bluesky",
            "--json",
            ...inStudio,
          ])
        ),
        {
          counts: { active: 0, disabled: 0, refreshNeeded: 1 },
          items: [{ id: blueskyId }],
          nextCursor: null,
        }
      );
      assert.include(
        yield* session.refused([
          "channels",
          "list",
          "--search",
          "x".repeat(101),
          ...inStudio,
        ]),
        "--search takes 1 to 100 characters."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "pages through the channels, and refuses a cursor no page gave",
    () =>
      Effect.gen(function* pages() {
        const session = yield* signedIn();

        const first = yield* session.printed([
          "channels",
          "list",
          "--limit",
          "2",
          ...inStudio,
        ]);

        assert.include(first, mastodonId);
        assert.include(first, blueskyId);
        assert.notInclude(first, tiktokId);
        assert.include(
          first,
          `More: the same command with --cursor ${blueskyId}`
        );

        const next = pageOf(
          yield* session.printed([
            "channels",
            "list",
            "--limit",
            "2",
            "--cursor",
            blueskyId,
            "--json",
            ...inStudio,
          ])
        );

        assert.deepStrictEqual(
          next.items.map(({ id }) => id),
          [tiktokId, youtubeId]
        );
        assert.isNotNull(next.nextCursor);
        assert.include(
          yield* session.refused([
            "channels",
            "list",
            "--cursor",
            draftId,
            ...inStudio,
          ]),
          "Peal could not read the request."
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal posts duplicate", () => {
  it.effect("makes a draft of a post, whatever its status", () =>
    Effect.gen(function* duplicates() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "posts",
          "duplicate",
          scheduledId,
          ...inStudio,
        ]),
        `Duplicated post ${scheduledId} as draft ${newPostId} in Studio, for ${mastodonId} (mastodon @studio@social.example.test): its text, media, channels with their options, and tags. It has no time: peal posts schedule ${newPostId} gives it one.`
      );

      const copy = postOf(
        yield* session.printed([
          "posts",
          "duplicate",
          finishedId,
          "--json",
          ...inStudio,
        ])
      );

      assert.strictEqual(copy.status, "draft");
      assert.isNull(copy.schedule);
      assert.strictEqual(
        copy.content.text,
        "A synthetic post that went out yesterday."
      );
      // The copy starts over on each channel.
      assert.isTrue(copy.targets.every(({ status }) => status === "pending"));

      const { posts } = yield* Ref.get(session.studio.state);
      const first = posts.find(({ id }) => id === newPostId);

      assert.deepStrictEqual(first?.tagIds, [campaignTagId]);
      assert.strictEqual(first?.status, "draft");
      assert.deepStrictEqual(yield* changes(session.studio), [
        `duplicate:${scheduledId}:${newPostId}`,
        `duplicate:${finishedId}:${copy.id}`,
      ]);
      assert.include(
        yield* session.refused(["posts", "duplicate", mastodonId, ...inStudio]),
        "The workspace has no such post."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says what the workspace no longer has, which it left out", () =>
    Effect.gen(function* leftOut() {
      const session = yield* signedIn();

      // The draft was for a channel disconnected since, showed media
      // deleted since, and its tag is gone.
      yield* Ref.update(session.studio.state, (current) => ({
        ...current,
        posts: current.posts.map((post) =>
          post.id === draftId
            ? {
                ...post,
                content: {
                  ...post.content,
                  media: [
                    {
                      altText: "",
                      mediaId: "0190f3a0-0000-7000-8000-00000000f0ff",
                    },
                  ],
                },
                tagIds: ["0190f3a0-0000-7000-8000-00000000a0ff"],
                targets: [
                  ...post.targets,
                  {
                    channelId: goneChannelId,
                    failureReason: null,
                    id: "0190f3a0-0000-7000-8000-00000000e0ff",
                    options: null,
                    parts: { count: 1, live: [] },
                    permalink: null,
                    publishedAt: null,
                    removedAt: null,
                    round: 1,
                    status: "pending" as const,
                    unconfirmedReason: null,
                  },
                ],
              }
            : post
        ),
      }));

      const printed = yield* session.printed([
        "posts",
        "duplicate",
        draftId,
        ...inStudio,
      ]);

      assert.include(printed, `Duplicated post ${draftId} as draft`);
      assert.include(
        printed,
        "Left out, as the workspace no longer has them: 1 channel no longer connected, 1 media deleted since, 1 tag deleted since."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
