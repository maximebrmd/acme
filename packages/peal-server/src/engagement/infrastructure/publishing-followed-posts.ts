import { Effect, Layer } from "effect";

import { FollowedPosts } from "#engagement/application/ports/followed-posts.ts";
import type { FollowedPost } from "#engagement/domain/thread.ts";
import { PublishedTargets } from "#publishing/application/published-targets.ts";

// Stories have no comments Peal reads, and leave after a day; a reel (a
// Facebook Page's, the only platform with the format) is published under
// its video's id, whose comments are not read yet. The listing leaves both
// out itself, so a page is short only at its end.
const unfollowed = ["story", "reel"] as const;

/**
 * The posts that went live, as the publishing context lists them, but
 * stories and reels.
 */
export const PublishingFollowedPosts = Layer.effect(
  FollowedPosts,
  Effect.gen(function* PublishingFollowedPosts() {
    const targets = yield* PublishedTargets;

    return FollowedPosts.of({
      from: (cursor, limit) =>
        targets.from(cursor, limit, unfollowed).pipe(
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
