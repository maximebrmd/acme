import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  blueskyId,
  failedTargetId,
  finishedId,
  mastodonId,
  scheduledId,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal posts remove-target, against the studio.

const inStudio = ["--workspace", "studio"];

const mastodonTargetId = "0190f3a0-0000-7000-8000-00000000e011";

const blueskyTargetId = "0190f3a0-0000-7000-8000-00000000e093";

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const ErrorSchema = Schema.fromJsonString(
  Schema.Struct({ error: Schema.Struct({ code: Schema.String }) })
);

// The post scheduled for next week, on Bluesky too.
const onBlueskyToo = (studio: Studio) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    posts: current.posts.map((post) => {
      const [first] = post.targets;

      return post.id === scheduledId && first !== undefined
        ? {
            ...post,
            targets: [
              ...post.targets,
              { ...first, channelId: blueskyId, id: blueskyTargetId },
            ],
          }
        : post;
    }),
  }));

describe("peal posts remove-target", () => {
  it.effect("takes one channel off a scheduled post", () =>
    Effect.gen(function* removes() {
      const session = yield* signedIn();

      yield* onBlueskyToo(session.studio);

      assert.include(
        yield* session.printed([
          "posts",
          "remove-target",
          scheduledId,
          blueskyTargetId,
          ...inStudio,
        ]),
        `Removed ${blueskyId}`
      );
      assert.include(
        yield* session.printed(["posts", "show", scheduledId, ...inStudio]),
        "removed from the post"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `remove-target:${blueskyTargetId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses the last channel, and says to cancel instead", () =>
    Effect.gen(function* refusesLast() {
      const session = yield* signedIn();

      const args = [
        "posts",
        "remove-target",
        scheduledId,
        mastodonTargetId,
        ...inStudio,
      ];

      assert.include(
        yield* session.refused(args),
        `peal posts cancel ${scheduledId} cancels the post instead`
      );

      const failure = yield* Schema.decodeUnknownEffect(ErrorSchema)(
        yield* session.refused([...args, "--json"])
      );

      assert.strictEqual(failure.error.code, "last_target_left");
      assert.deepStrictEqual(yield* changes(session.studio), []);
      assert.notInclude(
        yield* session.printed(["posts", "show", scheduledId, ...inStudio]),
        "removed from the post"
      );
      assert.include(
        yield* session.printed(["posts", "show", scheduledId, ...inStudio]),
        mastodonId
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a post that went out", () =>
    Effect.gen(function* refusesFinished() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "posts",
          "remove-target",
          finishedId,
          failedTargetId,
          ...inStudio,
        ]),
        "The post is finished"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
