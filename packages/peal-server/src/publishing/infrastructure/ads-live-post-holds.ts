import { Effect, Layer, Option } from "effect";

import { PostBoosts } from "#ads/application/post-boosts.ts";
import { LivePostHolds } from "#publishing/application/live-post-holds.ts";

/**
 * What holds a live post, from the ads context's boosts: a post a boost
 * that is not over shows cannot be deleted from its platform, or the ad
 * would go on spending on a post that is gone. An owner's decision: stop
 * the boost first.
 */
export const AdsLivePostHolds = Layer.effect(
  LivePostHolds,
  Effect.gen(function* AdsLivePostHolds() {
    const boosts = yield* PostBoosts;

    return LivePostHolds.of({
      ofTarget: (target) =>
        boosts
          .notOverOn(target)
          .pipe(
            Effect.map((count) =>
              count > 0 ? Option.some("boostRunning" as const) : Option.none()
            )
          ),
    });
  })
);
