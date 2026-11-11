import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { failedTargetId, finishedId, unconfirmedTargetId } from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal posts unpublish and peal posts changes, against the studio, whose
// platforms delete at once.

const inStudio = ["--workspace", "studio"];

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const ErrorSchema = Schema.fromJsonString(
  Schema.Struct({ error: Schema.Struct({ code: Schema.String }) })
);

// The post that went out yesterday, live on its Bluesky channel.
const liveOnBluesky = (studio: Studio) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    posts: current.posts.map((post) =>
      post.id === finishedId
        ? {
            ...post,
            targets: post.targets.map((target) =>
              target.id === unconfirmedTargetId
                ? {
                    ...target,
                    permalink: "https://bsky.example.test/post/1",
                    status: "published" as const,
                    unconfirmedReason: null,
                  }
                : target
            ),
          }
        : post
    ),
  }));

const unpublishArgs = (...more: readonly string[]) => [
  "posts",
  "unpublish",
  finishedId,
  ...inStudio,
  ...more,
];

describe("peal posts unpublish", () => {
  it.effect("asks first, and deletes nothing unasked", () =>
    Effect.gen(function* unasked() {
      const session = yield* signedIn();

      yield* liveOnBluesky(session.studio);

      // Nobody is at a terminal, and nobody said yes.
      const { errors, logs } = yield* session.refusedAfter(
        unpublishArgs("--channel", "0190f3a0-0000-7000-8000-00000000c002")
      );

      assert.include(logs, "for everyone. It cannot be undone from Peal.");
      assert.include(errors, "Nothing was done");
      assert.include(errors, "--yes");

      // Nor with --json, which never asks: before any request.
      const json = yield* session.refused(unpublishArgs("--json"));

      assert.strictEqual(
        Schema.decodeUnknownSync(ErrorSchema)(json).error.code,
        "confirmation_required"
      );

      for (const answer of ["", "no"]) {
        const refused = yield* session
          .answering([answer])
          .refusedAfter(unpublishArgs());

        assert.include(refused.logs, "Delete it? Type yes to confirm:");
        assert.include(refused.errors, "Not confirmed: nothing was done.");
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("deletes one channel with --yes, and says it was", () =>
    Effect.gen(function* oneChannel() {
      const session = yield* signedIn();

      yield* liveOnBluesky(session.studio);

      const said = yield* session.printed(
        unpublishArgs(
          "--channel",
          "0190f3a0-0000-7000-8000-00000000c002",
          "--yes"
        )
      );

      assert.include(said, "Deleted from 0190f3a0-0000-7000-8000-00000000c002");
      assert.deepStrictEqual(yield* changes(session.studio), [
        `unpublish:${unconfirmedTargetId}`,
      ]);

      // Removed once: asked again, the server says why not.
      const again = yield* session.refused(
        unpublishArgs(
          "--channel",
          "0190f3a0-0000-7000-8000-00000000c002",
          "--yes"
        )
      );

      assert.include(again, "Peal deleted it from the platform already");

      const listed = yield* session.printed([
        "posts",
        "changes",
        finishedId,
        ...inStudio,
      ]);

      assert.include(listed, "Deleted from");

      const removed = yield* session.printed([
        "posts",
        "list",
        "--removed",
        ...inStudio,
        "--json",
      ]);

      assert.include(removed, finishedId);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("deletes a whole post, and says where it could not", () =>
    Effect.gen(function* wholePost() {
      const session = yield* signedIn();

      yield* liveOnBluesky(session.studio);

      const said = yield* session.answering(["yes"]).printed(unpublishArgs());

      assert.include(said, "Deleted from");
      assert.include(said, "Not deleted from");
      assert.include(said, "it is not live there");
      assert.deepStrictEqual(yield* changes(session.studio), [
        `unpublish:${finishedId}`,
      ]);
      assert.notInclude(said, failedTargetId);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a channel the post is not on, before deleting", () =>
    Effect.gen(function* notOn() {
      const session = yield* signedIn();

      const refused = yield* session.refused(
        unpublishArgs("--channel", "@nobody", "--yes")
      );

      assert.include(refused, "is not on @nobody");
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
