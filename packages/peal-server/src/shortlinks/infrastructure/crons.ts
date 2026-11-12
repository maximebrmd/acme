import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { PurgeClicks } from "#shortlinks/application/purge-clicks.ts";

/**
 * Every day at 04:53 UTC: deletes the short links' click counts past
 * their retention. A failed run is logged and the next day's catches up.
 */
export const ClickRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("53 4 * * *", "UTC"),
  execute: PurgeClicks.use((purging) => purging.purge).pipe(
    Effect.tap((days) =>
      Effect.logInfo("Purged expired short link clicks").pipe(
        Effect.annotateLogs({ days })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired short link clicks failed", cause)
    )
  ),
  name: "shortlinks.click-retention",
  skipIfOlderThan: Duration.hours(12),
});
