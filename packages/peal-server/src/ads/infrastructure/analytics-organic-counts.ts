import { Effect, Layer, Option } from "effect";

import { OrganicCounts } from "#ads/application/ports/organic-counts.ts";
import type { OrganicOnChannel } from "#ads/application/ports/organic-counts.ts";
import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";

/**
 * A post's organic counts from the analytics context's own use case, which
 * checks that the actor may read analytics: the counts last read on each
 * channel the post is followed on.
 */
export const AnalyticsOrganicCounts = Layer.effect(
  OrganicCounts,
  Effect.gen(function* AnalyticsOrganicCounts() {
    const analytics = yield* AnalyticsQueries;

    return OrganicCounts.of({
      ofPost: (actor, postId) =>
        analytics.post(actor, postId).pipe(
          Effect.map((histories) =>
            histories.map(({ post }): OrganicOnChannel => ({
              channelId: post.channelId,
              counts: Option.all({
                latest: post.latest,
                readAt: post.lastCollectedAt,
              }).pipe(
                Option.map(({ latest, readAt }) => ({
                  impressions: latest.impressions,
                  likes: latest.likes,
                  readAt,
                  replies: latest.replies,
                  reposts: latest.reposts,
                }))
              ),
              targetId: post.targetId,
            }))
          )
        ),
    });
  })
);
