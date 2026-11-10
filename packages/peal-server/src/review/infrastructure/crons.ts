import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { PurgeReviewData } from "#review/application/purge-review-data.ts";

/**
 * Every day at 04:13 UTC: ends what the visitors of review links gave once
 * it is past its retention. A failed run is logged and the next day's
 * catches up.
 */
export const ReviewRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("13 4 * * *", "UTC"),
  execute: PurgeReviewData.use((purging) => purging.purge).pipe(
    Effect.tap((purged) =>
      Effect.logInfo("Purged expired review data").pipe(
        Effect.annotateLogs({ names: purged.names })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired review data failed", cause)
    )
  ),
  name: "review.retention",
  skipIfOlderThan: Duration.hours(12),
});
