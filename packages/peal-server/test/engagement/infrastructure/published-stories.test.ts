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

// Stories have no comments Peal reads: the inbox never follows one, and
// a run of stories never ends its discovery before the posts after them.

const Test = PublishingFollowedPosts.pipe(
  Layer.provide(DrizzlePublishedTargets),
  Layer.provideMerge(DatabaseTest)
);

layer(Test)("the posts the inbox follows", (it) => {
  it.effect("leave stories out, in pages as long as asked", () =>
    Effect.gen(function* stories() {
      const written = yield* publishedFormats("2047-05-01", "1790000000000002");

      yield* Effect.gen(function* checks() {
        const published = yield* FollowedPosts;

        const page = yield* published.from(
          { publishedAt: written.since, targetId: Option.none() },
          2
        );

        assert.deepStrictEqual(
          page.map(({ targetId }) => targetId),
          [written.feed, written.reel]
        );
      }).pipe(Effect.ensuring(deletePublished(written.postId)));
    })
  );
});
