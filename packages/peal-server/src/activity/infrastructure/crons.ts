import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { ActivityLog } from "#activity/application/activity-log.ts";
import { RequestLimiter } from "#activity/application/request-limiter.ts";

/**
 * Every hour at minute 23: deletes the request counts no window reads any
 * more. A failed run is logged and the next one catches up.
 */
export const RequestCountsCron = ClusterCron.make({
  cron: Cron.parseUnsafe("23 * * * *", "UTC"),
  execute: RequestLimiter.use((limiter) => limiter.purge).pipe(
    Effect.tap((deleted) =>
      Effect.logInfo("Purged past request counts").pipe(
        Effect.annotateLogs({ deleted })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging past request counts failed", cause)
    )
  ),
  name: "activity.request-counts",
  skipIfOlderThan: Duration.hours(2),
});

/**
 * Every day at 04:37 UTC: ends the activity logs' retention. A failed run
 * is logged and the next day's catches up.
 */
export const ActivityRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("37 4 * * *", "UTC"),
  execute: ActivityLog.use((log) => log.purge).pipe(
    Effect.tap((events) =>
      Effect.logInfo("Purged expired activity events").pipe(
        Effect.annotateLogs({ events })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired activity events failed", cause)
    )
  ),
  name: "activity.retention",
  skipIfOlderThan: Duration.hours(12),
});
