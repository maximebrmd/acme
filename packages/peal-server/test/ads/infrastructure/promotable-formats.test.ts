import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { PromotablePosts } from "#ads/application/ports/promotable-posts.ts";
import { PublishedPromotablePosts } from "#ads/infrastructure/published-promotable-posts.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzlePublishedTargets } from "#publishing/infrastructure/drizzle-published-targets.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import {
  deletePublished,
  publishedFormats,
} from "#test/publishing/published-formats.ts";

// A boost promotes a Page's post: a story has none that lasts, and a reel
// is known by its video's id. Neither is offered.

const Test = PublishedPromotablePosts.pipe(
  Layer.provide(
    Layer.mergeAll(DrizzlePublishedTargets, DrizzleChannelRepository)
  ),
  Layer.provideMerge(DatabaseTest)
);

layer(Test)("the posts an ad may promote", (it) => {
  it.effect("are feed posts only: no story, no reel", () =>
    Effect.gen(function* formats() {
      const written = yield* publishedFormats("2047-06-01", "1790000000000003");
      const { feed, reel, stories } = written.platformPostIds;

      yield* Effect.gen(function* checks() {
        const promotable = yield* PromotablePosts;

        const matched = yield* promotable.matching(written.workspaceId, [
          ...stories,
          feed,
          reel,
        ]);

        assert.deepStrictEqual([...matched.keys()], [feed]);
        assert.deepStrictEqual(
          yield* promotable.ofPost(written.workspaceId, written.postId),
          []
        );
      }).pipe(Effect.ensuring(deletePublished(written.postId)));
    })
  );
});
