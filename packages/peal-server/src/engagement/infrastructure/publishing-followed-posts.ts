import { Effect, Layer } from "effect";

import { FollowedPosts } from "#engagement/application/ports/followed-posts.ts";
import type { FollowedPost } from "#engagement/domain/thread.ts";
import { PublishedTargets } from "#publishing/application/published-targets.ts";

/** The posts that went live, as the publishing context lists them. */
export const PublishingFollowedPosts = Layer.effect(
  FollowedPosts,
  Effect.gen(function* PublishingFollowedPosts() {
    const targets = yield* PublishedTargets;

    return FollowedPosts.of({
      from: (cursor, limit) =>
        targets.from(cursor, limit).pipe(
          Effect.map((published) =>
            published.map((target): FollowedPost => ({
              authorId: target.authorId,
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
