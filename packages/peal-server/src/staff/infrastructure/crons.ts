import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { PurgeAuditLog } from "#staff/application/purge-audit-log.ts";

/**
 * Every day at 03:41 UTC: deletes the audit log's events past their
 * retention. A failed run is logged and the next day's catches up.
 */
export const AuditRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("41 3 * * *", "UTC"),
  execute: PurgeAuditLog.use((purging) => purging.purge).pipe(
    Effect.tap((deleted) =>
      Effect.logInfo("Purged expired audit events").pipe(
        Effect.annotateLogs({ deleted })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired audit events failed", cause)
    )
  ),
  name: "staff.audit-retention",
  skipIfOlderThan: Duration.hours(12),
});
