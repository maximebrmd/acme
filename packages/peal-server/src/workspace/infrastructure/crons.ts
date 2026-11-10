import { Cron, DateTime, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { ErasureLedger } from "#workspace/application/erasure-ledger.ts";
import { MeterPartnerUsage } from "#workspace/application/meter-partner-usage.ts";
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

/**
 * Every day at 23:41 UTC: counts what each partner account holds, its
 * workspaces and the channels connected across them, and keeps it for the
 * day, so a price by the workspace or by the connected channel has its
 * figures; and forgets the idempotency keys of workspace creations past
 * their day. A failed run is logged: the day keeps no count, or the
 * count of an earlier run.
 */
export const PartnerUsageCron = ClusterCron.make({
  cron: Cron.parseUnsafe("41 23 * * *", "UTC"),
  execute: MeterPartnerUsage.use((meter) => meter.run).pipe(
    Effect.tap(({ keys, partners }) =>
      Effect.logInfo("Counted what partner accounts hold").pipe(
        Effect.annotateLogs({ keys, partners })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Counting what partner accounts hold failed", cause)
    )
  ),
  name: "workspace.partner-usage",
  skipIfOlderThan: Duration.hours(6),
});
