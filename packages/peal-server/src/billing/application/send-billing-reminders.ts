import { Context, DateTime, Effect, Layer, Match, Option } from "effect";

import type { BillingNotice, Money } from "#billing/domain/billing-notice.ts";
import { planAllowances } from "#billing/domain/plans.ts";
import { currency, priceOf } from "#billing/domain/prices.ts";
import {
  confirmationOf,
  reminderKey,
  reminderOf,
} from "#billing/domain/reminders.ts";
import type { Reminder } from "#billing/domain/reminders.ts";
import { excessesOf } from "#billing/domain/standing.ts";
import type { Excess } from "#billing/domain/standing.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { BillingNotices } from "./ports/billing-notices.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";

// What Stripe charges, taxes included: the next invoice's total for a
// renewal, the first paid invoice's for a confirmation. None when Stripe
// cannot say yet, as before the first invoice is paid: the notice then
// waits for the next run.
const chargedFor = (reminder: Reminder) =>
  StripeContracts.use((stripe) => {
    const { subscription } = reminder;
    const { stripeSubscriptionId: id, workspaceId } = subscription;

    return Match.valueTags(reminder, {
      renewal: () => stripe.upcomingTotal(workspaceId, id),
      started: () =>
        // A trial charges nothing: it shows the plan's price, excluding
        // VAT, which an order would cost.
        subscription.status === "trialing"
          ? Effect.succeed(
              Option.some<Money>({
                amount: priceOf(subscription.plan, subscription.interval),
                currency,
              })
            )
          : stripe
              .paidInvoices(workspaceId, id)
              .pipe(
                Effect.map((invoices) =>
                  Option.fromUndefinedOr(invoices.at(-1)).pipe(
                    Option.map(({ paid }) => paid)
                  )
                )
              ),
      // The notice names no price.
      trialEnding: () =>
        Effect.succeed(Option.some<Money>({ amount: 0, currency })),
    });
  });

// What the workspace holds beyond the free plan, which it moves to when
// its trial ends: nothing for the other reminders, which read nothing.
const overFreePlan = (reminder: Reminder) =>
  reminder._tag === "trialEnding"
    ? WorkspaceUsage.use((usage) =>
        usage.of(reminder.subscription.workspaceId)
      ).pipe(Effect.map((held) => excessesOf(planAllowances.free, held)))
    : Effect.succeed<readonly Excess[]>([]);

const noticeOf = (
  reminder: Reminder,
  price: Money,
  over: readonly Excess[]
): BillingNotice => {
  const { subscription } = reminder;

  return Match.valueTags(reminder, {
    renewal: ({ renewsAt }): BillingNotice => ({
      _tag: "SubscriptionRenewing",
      plan: subscription.plan,
      price,
      renewsAt,
    }),
    started: ({ startedAt }): BillingNotice => ({
      _tag: "SubscriptionStarted",
      interval: subscription.interval,
      plan: subscription.plan,
      price,
      startedAt,
      trialEnd:
        subscription.status === "trialing"
          ? subscription.trialEnd
          : Option.none(),
    }),
    trialEnding: ({ endsAt }): BillingNotice => ({
      _tag: "TrialEnding",
      endsAt,
      over,
      plan: subscription.plan,
    }),
  });
};

/**
 * Tells the members who manage billing, once each: that a subscription
 * started, the confirmation of the contract on a durable medium (CRD art.
 * 8(7)); that a trial ends in three days, with what the workspace holds
 * beyond the free plan it then moves to; and that a yearly plan renews in
 * about 45 days, so between one and three months before (Code de la
 * consommation L215-1), with its price and how to cancel. The price is
 * what Stripe charges, taxes included: the first paid invoice's for a
 * confirmation, the next invoice's for a renewal; a notice Stripe cannot
 * price yet, or cannot be asked for, waits for the next run. Runs hourly,
 * on the `billing.reminders` cron; says how many it told. A server that
 * does not bill tells nothing.
 */
export class SendBillingReminders extends Context.Service<
  SendBillingReminders,
  { readonly run: Effect.Effect<number, DatabaseError> }
>()("peal-server/billing/application/SendBillingReminders") {
  static readonly layer = Layer.effect(
    SendBillingReminders,
    Effect.gen(function* SendBillingRemindersLive() {
      const { enabled } = yield* BillingMode;
      const subscriptions = yield* Subscriptions;
      const notices = yield* BillingNotices;
      const context = yield* Effect.context<StripeContracts | WorkspaceUsage>();

      const run = Effect.gen(function* run() {
        if (!enabled) {
          return 0;
        }

        const now = yield* DateTime.now;
        const candidates = yield* subscriptions.remindable(now);

        const due = candidates.flatMap((subscription) => [
          ...Option.toArray(confirmationOf(subscription, now)),
          ...Option.toArray(reminderOf(subscription, now)),
        ]);

        const told = yield* Effect.forEach(
          due,
          (reminder) =>
            chargedFor(reminder).pipe(
              Effect.provide(context),
              Effect.catchTag("StripeUnreachable", () =>
                Effect.logWarning(
                  "Stripe could not price a billing notice: it waits"
                ).pipe(Effect.as(Option.none<Money>()))
              ),
              Effect.flatMap((price) =>
                Option.match(price, {
                  onNone: () => Effect.succeed(0),
                  onSome: (charged) =>
                    overFreePlan(reminder).pipe(
                      Effect.provide(context),
                      Effect.flatMap((over) =>
                        notices.tell({
                          key: reminderKey(reminder),
                          notice: noticeOf(reminder, charged, over),
                          workspaceId: reminder.subscription.workspaceId,
                        })
                      ),
                      Effect.as(1)
                    ),
                })
              )
            ),
          { concurrency: 1 }
        );

        return told.reduce((sum, one) => sum + one, 0);
      }).pipe(Effect.withSpan("SendBillingReminders.run"));

      return SendBillingReminders.of({ run });
    })
  );
}
