import { Cron, Duration, Effect, Layer } from "effect";
import { ClusterCron } from "effect/cluster";

import { BoostFollowUp } from "#ads/application/boost-follow-up.ts";
import { PurgeAdData } from "#ads/application/purge-ad-data.ts";
import { SyncAdAccounts } from "#ads/application/sync-ad-accounts.ts";

/**
 * Every hour at minute 37: reads the ad accounts that are due, through
 * each one's gate. A run stops starting reads 50 minutes after its
 * scheduled time, before the next one, and says what it left; one more
 * than 50 minutes late is skipped: the next one reads what it would have.
 */
const SyncCron = ClusterCron.make({
  cron: Cron.parseUnsafe("37 * * * *", "UTC"),
  execute: Effect.gen(function* syncAdAccounts() {
    const at = yield* ClusterCron.CurrentScheduledTime;
    const report = yield* SyncAdAccounts.use((sync) => sync.run(at));

    if (Object.values(report).some((count) => count > 0)) {
      yield* Effect.logInfo("Synced ad accounts", report);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The sync of ad accounts failed", cause)
    )
  ),
  name: "ads.sync",
  skipIfOlderThan: Duration.minutes(50),
});

/**
 * Every 10 minutes: ends the boosts whose end date passed, and tells
 * their workspaces. The network stops them at their end time on its own:
 * nothing is sent.
 */
const EndBoostsCron = ClusterCron.make({
  cron: Cron.parseUnsafe("*/10 * * * *", "UTC"),
  execute: BoostFollowUp.use((followUp) => followUp.endDue).pipe(
    Effect.tap((ended) =>
      ended > 0
        ? Effect.logInfo("Ended boosts past their end date").pipe(
            Effect.annotateLogs({ ended })
          )
        : Effect.void
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Ending boosts past their end date failed", cause)
    )
  ),
  name: "ads.end-boosts",
  skipIfOlderThan: Duration.minutes(9),
});

/**
 * Every day at 04:41 UTC: ends the retention of ads' days and of the
 * audit trail, and removes sign-ins that connected nothing. A failed run
 * is logged and the next day's catches up.
 */
const RetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("41 4 * * *", "UTC"),
  execute: PurgeAdData.use((purging) => purging.purge).pipe(
    Effect.tap((report) =>
      Effect.logInfo("Purged expired ads data").pipe(
        Effect.annotateLogs({ ...report })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired ads data failed", cause)
    )
  ),
  name: "ads.retention",
  skipIfOlderThan: Duration.hours(12),
});

/** The ads context's crons. Their names are stored: never rename one. */
export const AdsCronsLive = Layer.mergeAll(
  SyncCron,
  EndBoostsCron,
  RetentionCron
);
