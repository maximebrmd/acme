import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { SendWeeklyDigests } from "#notifications/application/send-weekly-digests.ts";

/**
 * Every hour of Monday, at 19 past (UTC): the weekly digest of the week
 * that ended at midnight to everyone who turned it on and is still to
 * have it, and only to them; with nobody, the run reads one page of
 * nobody. The first run sends them all; the later ones send what the mail
 * transport refused for now, or a run left. A run more than 50 minutes
 * late is skipped, as the next one does its work. A failed run is logged
 * as an error.
 */
export const WeeklyDigestCron = ClusterCron.make({
  cron: Cron.parseUnsafe("19 * * * 1", "UTC"),
  execute: Effect.gen(function* weeklyDigest() {
    const at = yield* ClusterCron.CurrentScheduledTime;

    const report = yield* SendWeeklyDigests.use((digests) => digests.run(at));

    if (report.readers > 0) {
      yield* Effect.logInfo("Sent the weekly digests", report);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logError("The weekly digest run failed", cause)
    )
  ),
  name: "notifications.weekly-digest",
  skipIfOlderThan: Duration.minutes(50),
});
