import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { PurgeContractRecords } from "#billing/application/purge-contract-records.ts";

/**
 * Every day at 04:23 UTC: deletes the orders and withdrawals of workspaces
 * erased more than 5 years ago. A failed run is logged and the next one
 * catches up.
 */
export const contractRetention = ClusterCron.make({
  cron: Cron.parseUnsafe("23 4 * * *", "UTC"),
  execute: PurgeContractRecords.use((records) => records.run).pipe(
    Effect.tap((purged) =>
      Effect.logInfo("Purged erased workspaces' contract records").pipe(
        Effect.annotateLogs({ purged })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging contract records failed", cause)
    )
  ),
  name: "billing.contract-retention",
  skipIfOlderThan: Duration.days(1),
});
