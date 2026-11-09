import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { PurgeLegalRecords } from "#legal/application/purge-legal-records.ts";

/**
 * Every day at 03:47 UTC: ends what the law no longer has Peal keep. A
 * failed run is logged and the next day's catches up.
 */
export const LegalRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("47 3 * * *", "UTC"),
  execute: PurgeLegalRecords.use((purging) => purging.purge).pipe(
    Effect.tap((changed) =>
      Effect.logInfo("Purged expired legal records").pipe(
        Effect.annotateLogs({ changed })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired legal records failed", cause)
    )
  ),
  name: "legal.retention",
  skipIfOlderThan: Duration.hours(12),
});
