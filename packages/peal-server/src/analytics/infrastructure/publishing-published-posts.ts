import { Effect, Layer } from "effect";

import { PublishedPosts } from "#analytics/application/published-posts.ts";
import type { Publication } from "#analytics/domain/tracked-post.ts";
import { PublishedTargets } from "#publishing/application/published-targets.ts";

/** The posts that went live, as the publishing context lists them. */
export const PublishingPublishedPosts = Layer.effect(
  PublishedPosts,
  Effect.gen(function* PublishingPublishedPosts() {
    const targets = yield* PublishedTargets;

    return PublishedPosts.of({
      from: (cursor, limit) =>
        targets.from(cursor, limit).pipe(
          Effect.map((published) =>
            published.map((target): Publication => ({
              channelId: target.channelId,
              permalink: target.permalink,
              platformPostId: target.platformPostId,
              postId: target.postId,
              publishedAt: target.publishedAt,
              targetId: target.targetId,
              workspaceId: target.workspaceId,
            }))
          )
        ),
    });
  })
);
