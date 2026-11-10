import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { CollectAccounts } from "#analytics/application/collect-accounts.ts";
import { CollectMetrics } from "#analytics/application/collect-metrics.ts";
import { PurgeAnalytics } from "#analytics/application/purge-analytics.ts";

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

/**
 * Every hour at minute 37, half an hour from the posts' collection:
 * follows the channels connected since the last run and reads the accounts
 * due, each once a day, through each channel's gate. A run stops reading 40
 * minutes after its scheduled time, and one more than 40 minutes late is
 * skipped: the next one reads what it would have.
 */
export const CollectAccountsCron = ClusterCron.make({
  cron: Cron.parseUnsafe("37 * * * *", "UTC"),
  execute: Effect.gen(function* collectAccounts() {
    const at = yield* ClusterCron.CurrentScheduledTime;
    const report = yield* CollectAccounts.use((collect) => collect.run(at));

    if (Object.values(report).some((count) => count > 0)) {
      yield* Effect.logInfo("Collected accounts' numbers", report);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The accounts collection failed", cause)
    )
  ),
  name: "analytics.collect-accounts",
  skipIfOlderThan: Duration.minutes(40),
});

/**
 * Every day at 03:23 UTC: deletes what analytics kept past its retention,
 * each platform's cap included.
 */
export const AnalyticsRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("23 3 * * *", "UTC"),
  execute: Effect.gen(function* purgeAnalytics() {
    const at = yield* ClusterCron.CurrentScheduledTime;
    const report = yield* PurgeAnalytics.use(({ purge }) => purge(at));

    if (Object.values(report).some((count) => count > 0)) {
      yield* Effect.logInfo("Purged analytics past its retention", report);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The analytics retention job failed", cause)
    )
  ),
  name: "analytics.retention",
});
