import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { SendWeeklyDigests } from "#notifications/application/send-weekly-digests.ts";

/**
 * Each Monday at 06:19 UTC: the weekly digest of the week that ended at
 * midnight to everyone who turned it on, and only to them; with nobody,
 * the run reads one page of nobody. A run more than half a day late is
 * skipped: the week's digest is not sent then. A failed run is logged.
 */
export const WeeklyDigestCron = ClusterCron.make({
  cron: Cron.parseUnsafe("19 6 * * 1", "UTC"),
  execute: Effect.gen(function* weeklyDigest() {
    const at = yield* ClusterCron.CurrentScheduledTime;

    const report = yield* SendWeeklyDigests.use((digests) => digests.run(at));

    if (report.readers > 0) {
      yield* Effect.logInfo("Sent the weekly digests", report);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The weekly digest run failed", cause)
    )
  ),
  name: "notifications.weekly-digest",
  skipIfOlderThan: Duration.hours(12),
});
