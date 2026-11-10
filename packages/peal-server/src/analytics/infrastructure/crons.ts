import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { CollectMetrics } from "#analytics/application/collect-metrics.ts";

/**
 * Every hour at minute 7: follows the posts that went live since the last
 * run and reads the counts of those due, through each channel's gate. The
 * reads after it are counted from the run's scheduled time, so they come
 * due on the run an hour or a day later. A run stops reading 50 minutes
 * after its scheduled time, before the next one, and says what it left; one
 * more than 50 minutes late is skipped: the next one reads what it would
 * have.
 */
export const CollectMetricsCron = ClusterCron.make({
  cron: Cron.parseUnsafe("7 * * * *", "UTC"),
  execute: Effect.gen(function* collectMetrics() {
    const at = yield* ClusterCron.CurrentScheduledTime;
    const report = yield* CollectMetrics.use((collect) => collect.run(at));

    if (Object.values(report).some((count) => count > 0)) {
      yield* Effect.logInfo("Collected post metrics", report);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The metrics collection failed", cause)
    )
  ),
  name: "analytics.collect-metrics",
  skipIfOlderThan: Duration.minutes(50),
});
