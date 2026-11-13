import { Cron, DateTime, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { SnapshotUsage } from "#billing/application/snapshot-usage.ts";

/**
 * Every day at 00:11 UTC: writes the day that just ended's states of every
 * workspace in the usage ledger, starts today's account-days, then deletes
 * the rows past their 400 days.
 * It calls no platform. A run skipped or failed leaves that day without
 * states; the next day's runs as usual.
 */
export const usageSnapshot = ClusterCron.make({
  cron: Cron.parseUnsafe("11 0 * * *", "UTC"),
  execute: SnapshotUsage.use((snapshot) => snapshot.run).pipe(
    Effect.tap(({ accountDays, accountDaysPurged, day, purged, workspaces }) =>
      Effect.logInfo("Wrote the day's usage of every workspace").pipe(
        Effect.annotateLogs({
          accountDays,
          accountDaysPurged,
          day: DateTime.formatIsoDateUtc(day),
          purged,
          workspaces,
        })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Writing the day's usage failed", cause)
    )
  ),
  name: "billing.usage-snapshot",
  skipIfOlderThan: Duration.hours(12),
});
