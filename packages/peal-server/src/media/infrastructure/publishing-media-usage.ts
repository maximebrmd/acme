import { Effect, Layer, Match } from "effect";

import { MediaInUse } from "#media/application/media-in-use.ts";
import { MediaUsage } from "#media/application/ports/media-usage.ts";
import { MediaInPosts } from "#publishing/application/media-in-posts.ts";
import type { PostId } from "#shared/domain/ids.ts";

/**
 * Where posts and articles show assets, as the publishing context's
 * MediaInPosts tells.
 * The database failing is the server's own failure, as for the media
 * context's own tables.
 */
export const PublishingMediaUsage = Layer.effect(
  MediaUsage,
  Effect.gen(function* PublishingMediaUsage() {
    const posts = yield* MediaInPosts;

    return MediaUsage.of({
      of: (workspaceId, assetId) =>
        posts.usage(workspaceId, assetId).pipe(
          Effect.orDie,
          Effect.map(({ articles, drafts, scheduled }) => ({
            draftArticles: articles.drafts,
            drafts,
            scheduled,
            scheduledArticles: articles.scheduled,
          }))
        ),
      release: (workspaceId, assetId) =>
        posts.release(workspaceId, assetId).pipe(
          Effect.orDie,
          Effect.flatMap((release) =>
            Match.valueTags(release, {
              inUse: ({ articles, scheduled }) =>
                Effect.fail(
                  new MediaInUse({
                    articleIds: articles,
                    assetId,
                    postIds: scheduled,
                  })
                ),
              released: ({ drafts }) => Effect.succeed(drafts),
              unused: () => Effect.succeed<readonly PostId[]>([]),
            })
          )
        ),
    });
  })
);
