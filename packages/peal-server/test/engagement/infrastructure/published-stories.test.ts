import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { FollowedPosts } from "#engagement/application/ports/followed-posts.ts";
import { PublishingFollowedPosts } from "#engagement/infrastructure/publishing-followed-posts.ts";
import { DrizzlePublishedTargets } from "#publishing/infrastructure/drizzle-published-targets.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import {
  deletePublished,
  publishedFormats,
} from "#test/publishing/published-formats.ts";

// Stories have no comments Peal reads, and a Facebook reel is published
// under its video's id, whose comments the inbox does not read yet: it
// follows neither, and a run of them never ends its discovery before the
// posts after them.

const Test = PublishingFollowedPosts.pipe(
  Layer.provide(DrizzlePublishedTargets),
  Layer.provideMerge(DatabaseTest)
);

layer(Test)("the posts the inbox follows", (it) => {
  it.effect(
    "leave stories and Facebook reels out, in pages as long as asked",
    () =>
      Effect.gen(function* stories() {
        const written = yield* publishedFormats(
          "2047-05-01",
          "1790000000000002"
        );

        yield* Effect.gen(function* checks() {
          const published = yield* FollowedPosts;

          const page = yield* published.from(
            { publishedAt: written.since, targetId: Option.none() },
            2
          );

          // The listing is every workspace's: a page goes on to the posts
          // other suites write after this one's day, at the same time.
          assert.deepStrictEqual(
            page
              .filter(({ workspaceId }) => workspaceId === written.workspaceId)
              .map(({ targetId }) => targetId),
            [written.feed]
          );
        }).pipe(Effect.ensuring(deletePublished(written.postId)));
      })
  );
});
