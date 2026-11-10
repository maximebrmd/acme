import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { PostScheduling } from "#publishing/application/post-scheduling.ts";

/**
 * Every day at 04:17 UTC: deletes the idempotency keys past their lifetime.
 * A key past it is free again whether or not this ran; the run only keeps
 * the table from growing. A failed run is logged and the next day's
 * catches up.
 */
export const IdempotencyRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("17 4 * * *", "UTC"),
  execute: PostScheduling.use(
    (scheduling) => scheduling.forgetExpiredKeys
  ).pipe(
    Effect.tap((deleted) =>
      Effect.logInfo("Purged expired idempotency keys").pipe(
        Effect.annotateLogs({ deleted })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired idempotency keys failed", cause)
    )
  ),
  name: "publishing.idempotency-retention",
  skipIfOlderThan: Duration.hours(12),
});
