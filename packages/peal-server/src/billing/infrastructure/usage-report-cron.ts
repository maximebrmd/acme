import { Cron, Duration, Effect, Layer } from "effect";
import { ClusterCron } from "effect/cluster";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { ReportUsage } from "#billing/application/report-usage.ts";
import { StartAccountDays } from "#billing/application/start-account-days.ts";

/**
 * Every five minutes from minute 3, minutes no collection and no cron that
 * calls platforms through the gates starts on: sends the outbox of usage to Stripe, then says
 * what it left (`peal.billing.usage_report.left`, `.oldest_age`,
 * `.ran_at`). A run skipped or failed leaves the reports to the next.
 */
export const usageReport = ClusterCron.make({
  cron: Cron.parseUnsafe("3-59/5 * * * *", "UTC"),
  execute: ReportUsage.use((report) => report.run).pipe(
    Effect.tap(({ deferred, left, refused, sent }) =>
      sent + refused + deferred === 0
        ? Effect.void
        : Effect.logInfo("Reported usage to Stripe").pipe(
            Effect.annotateLogs({ deferred, left, refused, sent })
          )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Reporting usage to Stripe failed", cause)
    )
  ),
  name: "billing.usage-report",
  skipIfOlderThan: Duration.minutes(4),
});

/**
 * Every day at 01:19 UTC: gives every per-account subscription the items
 * of the catalogue, and lifts the ceiling and threshold of those whose
 * first invoice was paid. What Stripe did not answer waits for tomorrow.
 */
export const usageItems = ClusterCron.make({
  cron: Cron.parseUnsafe("19 1 * * *", "UTC"),
  execute: ReportUsage.use((report) => report.daily).pipe(
    Effect.tap((kept) =>
      Effect.logInfo("Kept the per-account subscriptions at Stripe").pipe(
        Effect.annotateLogs({ ...kept })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Keeping the per-account subscriptions failed", cause)
    )
  ),
  name: "billing.usage-items",
  skipIfOlderThan: Duration.hours(12),
});

/**
 * Every hour at minute 49: starts today's account-days of every billing
 * account again. The 00:11 snapshot starts them first; a batch it could
 * not start, or a day it did not run on, is started within the hour, and
 * a second run changes nothing more. It calls no platform and no Stripe
 * but through the outbox.
 */
export const accountDaysStart = ClusterCron.make({
  cron: Cron.parseUnsafe("49 * * * *", "UTC"),
  execute: StartAccountDays.use((start) => start.run).pipe(
    Effect.tap(({ accounts, started }) =>
      started === accounts
        ? Effect.void
        : Effect.logWarning("Some billing accounts' day is not started").pipe(
            Effect.annotateLogs({ accounts, started })
          )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Starting the day's account-days failed", cause)
    )
  ),
  name: "billing.account-days",
  skipIfOlderThan: Duration.minutes(30),
});

/**
 * The reporter's crons and the hourly start of the day, registered only
 * on a server that bills: one that does not counts and reports nothing,
 * so it runs none of them.
 */
export const usageReporting = Layer.unwrap(
  Effect.gen(function* usageReporting() {
    const { enabled } = yield* BillingMode;

    return enabled
      ? Layer.mergeAll(usageReport, usageItems, accountDaysStart)
      : Layer.empty;
  })
);
