import { Cron, DateTime, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { ErasureLedger } from "#workspace/application/erasure-ledger.ts";
import { erasureLedgerCutoff } from "#workspace/domain/erasure-ledger.ts";

/**
 * Every day at 04:17 UTC: drops the erasure ledger's entries past their
 * 42 days, by which no backup holds what they erased. A failed run is
 * logged and the next day's catches up; a lifecycle rule on the bucket
 * does the same where the store has them.
 */
export const ErasureLedgerRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("17 4 * * *", "UTC"),
  execute: DateTime.now.pipe(
    Effect.flatMap((now) =>
      ErasureLedger.use((ledger) => ledger.expire(erasureLedgerCutoff(now)))
    ),
    Effect.tap((expired) =>
      Effect.logInfo("Dropped expired entries of the erasure ledger").pipe(
        Effect.annotateLogs({ expired })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Dropping expired erasure ledger entries failed", cause)
    )
  ),
  name: "workspace.erasure-ledger-retention",
  skipIfOlderThan: Duration.hours(12),
});
