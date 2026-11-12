import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { PublishedPosts } from "#analytics/application/published-posts.ts";
import { PublishingPublishedPosts } from "#analytics/infrastructure/publishing-published-posts.ts";
import { DrizzlePublishedTargets } from "#publishing/infrastructure/drizzle-published-targets.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import {
  deletePublished,
  publishedFormats,
} from "#test/publishing/published-formats.ts";

// Stories have no statistics Peal reads: analytics never follows one, and
// a run of stories never ends its discovery before the posts after them.

const Test = PublishingPublishedPosts.pipe(
  Layer.provide(DrizzlePublishedTargets),
  Layer.provideMerge(DatabaseTest)
);

layer(Test)("the posts analytics follows", (it) => {
  it.effect("leave stories out, in pages as long as asked", () =>
    Effect.gen(function* stories() {
      const written = yield* publishedFormats("2047-04-01", "1790000000000001");

      yield* Effect.gen(function* checks() {
        const published = yield* PublishedPosts;

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
          [written.feed, written.reel]
        );
      }).pipe(Effect.ensuring(deletePublished(written.postId)));
    })
  );
});
