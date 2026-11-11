import { Effect, Layer } from "effect";

import { PublishedPosts } from "#analytics/application/published-posts.ts";
import type { Publication } from "#analytics/domain/tracked-post.ts";
import { PublishedTargets } from "#publishing/application/published-targets.ts";

// Stories have no statistics Peal reads, and leave after a day: the
// listing leaves them out itself, so a page is short only at its end.
const unfollowed = ["story"] as const;

/**
 * The posts that went live, as the publishing context lists them, but
 * stories.
 */
export const PublishingPublishedPosts = Layer.effect(
  PublishedPosts,
  Effect.gen(function* PublishingPublishedPosts() {
    const targets = yield* PublishedTargets;

    return PublishedPosts.of({
      from: (cursor, limit) =>
        targets.from(cursor, limit, unfollowed).pipe(
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
