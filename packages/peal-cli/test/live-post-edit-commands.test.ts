import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  failedTargetId,
  finishedId,
  instagramId,
  mastodonId,
  tiktokId,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal posts edit, against the studio, whose platforms edit at once.

const inStudio = ["--workspace", "studio"];

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

// The post that went out yesterday, live on its Mastodon channel.
const liveOnMastodon = (studio: Studio) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    posts: current.posts.map((post) =>
      post.id === finishedId
        ? {
            ...post,
            targets: post.targets.map((target) =>
              target.id === failedTargetId
                ? {
                    ...target,
                    failureReason: null,
                    permalink: "https://social.example.test/@studio/1",
                    status: "published" as const,
                  }
                : target
            ),
          }
        : post
    ),
  }));

// Two more channels on the post, live, which share a handle.
const liveOnTwinHandles = (studio: Studio) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    posts: current.posts.map((post) =>
      post.id === finishedId
        ? {
            ...post,
            targets: [
              ...post.targets,
              ...[
                ["0190f3a0-0000-7000-8000-00000000e091", tiktokId],
                ["0190f3a0-0000-7000-8000-00000000e092", instagramId],
              ].map(([id = "", channelId = ""]) => ({
                channelId,
                editedAt: null,
                failureReason: null,
                id,
                options: null,
                parts: { count: 1, live: [] },
                permalink: `https://${channelId}.example.test/post/1`,
                publishedAt: null,
                removedAt: null,
                round: 1,
                status: "published" as const,
                unconfirmedReason: null,
              })),
            ],
          }
        : post
    ),
  }));

const editArgs = (...more: readonly string[]) => [
  "posts",
  "edit",
  finishedId,
  ...inStudio,
  ...more,
];

const ChangeSchema = Schema.fromJsonString(
  Schema.Struct({ kind: Schema.String, status: Schema.String })
);

describe("peal posts edit", () => {
  it.effect("edits a channel's text, and says it did", () =>
    Effect.gen(function* edits() {
      const session = yield* signedIn();

      yield* liveOnMastodon(session.studio);

      const said = yield* session.printed(
        editArgs(
          "--channel",
          mastodonId,
          "--text",
          "A corrected synthetic post."
        )
      );

      assert.include(said, "Edited on");
      assert.deepStrictEqual(yield* changes(session.studio), [
        `edit:${failedTargetId}:0`,
      ]);

      const post = (yield* Ref.get(session.studio.state)).posts.find(
        ({ id }) => id === finishedId
      );

      assert.deepStrictEqual(post?.content.overrides, [
        { channelId: mastodonId, text: "A corrected synthetic post." },
      ]);

      const json = yield* session.printed(
        editArgs("--channel", mastodonId, "--text", "Again.", "--json")
      );

      assert.deepStrictEqual(Schema.decodeUnknownSync(ChangeSchema)(json), {
        kind: "edit",
        status: "done",
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says why a channel cannot be edited", () =>
    Effect.gen(function* notEdited() {
      const session = yield* signedIn();

      // Not live on Mastodon yet: it failed there.
      assert.include(
        yield* session.refused(
          editArgs("--channel", mastodonId, "--text", "Corrected.")
        ),
        "it is not live there"
      );

      yield* liveOnMastodon(session.studio);

      // A part the post does not have.
      assert.include(
        yield* session.refused(
          editArgs(
            "--channel",
            mastodonId,
            "--text",
            "Corrected.",
            "--part",
            "3"
          )
        ),
        "Peal has no id for it, or for that part"
      );

      assert.include(
        yield* session.refused(
          editArgs("--channel", mastodonId, "--text", "x", "--part", "-1")
        ),
        "--part counts from 0"
      );

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "refuses a handle two of the post's channels share, naming both, before editing",
    () =>
      Effect.gen(function* ambiguous() {
        const session = yield* signedIn();

        yield* liveOnTwinHandles(session.studio);

        const refused = yield* session.refused(
          editArgs("--channel", "@studio_example", "--text", "Corrected.")
        );

        assert.include(refused, "more than one of the post's channels");
        assert.include(refused, tiktokId);
        assert.include(refused, instagramId);

        assert.include(
          yield* session.refused(
            editArgs("--channel", "@nobody", "--text", "Corrected.")
          ),
          "is not on @nobody"
        );
        assert.deepStrictEqual(yield* changes(session.studio), []);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
