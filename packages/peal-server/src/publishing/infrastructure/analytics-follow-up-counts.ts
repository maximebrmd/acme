import { Effect, Layer } from "effect";

import { PostLikes } from "#analytics/application/post-likes.ts";
import { FollowUpCounts } from "#publishing/application/follow-up-counts.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";

/**
 * The likes a rule waits for, as the analytics context last read them
 * (PostLikes): what its hourly, then daily, collection counted, never a
 * read of its own. A platform analytics reads nothing of (X without its
 * operator's or its workspace's reads turned on) answers nothing.
 */
export const AnalyticsFollowUpCounts = Layer.effect(
  FollowUpCounts,
  Effect.gen(function* AnalyticsFollowUpCounts() {
    const likes = yield* PostLikes;

    return FollowUpCounts.of({
      likesOf: (targetIds) =>
        likes.of(targetIds).pipe(
          Effect.map(
            (read) =>
              new Map(
                targetIds.flatMap((targetId): [PostTargetId, number][] => {
                  const count = read.get(targetId);

                  return count === undefined ? [] : [[targetId, count]];
                })
              )
          )
        ),
    });
  })
);
