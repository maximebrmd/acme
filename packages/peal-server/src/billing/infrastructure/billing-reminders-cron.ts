import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { SendBillingReminders } from "#billing/application/send-billing-reminders.ts";

/**
 * Every hour at minute 17: confirms the subscriptions that started, and
 * reminds members that a trial ends in three days and that a yearly plan
 * renews in about 45 days. Each goes out once, under its key; a failed run
 * is logged and the next one catches up.
 */
export const billingReminders = ClusterCron.make({
  cron: Cron.parseUnsafe("17 * * * *", "UTC"),
  execute: SendBillingReminders.use((reminders) => reminders.run).pipe(
    Effect.tap((told) =>
      Effect.logInfo("Sent billing reminders").pipe(
        Effect.annotateLogs({ told })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Sending billing reminders failed", cause)
    )
  ),
  name: "billing.reminders",
  skipIfOlderThan: Duration.hours(1),
});
