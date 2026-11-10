import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { PurgeDeliveries } from "#webhooks/application/purge-deliveries.ts";

/**
 * Every day at 04:23 UTC: ends the delivery logs' retention. A failed run
 * is logged and the next day's catches up.
 */
export const WebhooksCronsLive = ClusterCron.make({
  cron: Cron.parseUnsafe("23 4 * * *", "UTC"),
  execute: PurgeDeliveries.use((purging) => purging.purge).pipe(
    Effect.tap((deliveries) =>
      Effect.logInfo("Purged expired webhook deliveries").pipe(
        Effect.annotateLogs({ deliveries })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired webhook deliveries failed", cause)
    )
  ),
  name: "webhooks.delivery-retention",
  skipIfOlderThan: Duration.hours(12),
});
