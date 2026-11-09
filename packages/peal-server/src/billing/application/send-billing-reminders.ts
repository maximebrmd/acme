import { Context, DateTime, Effect, Layer, Match, Option } from "effect";

import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import { currency, priceOf } from "#billing/domain/prices.ts";
import {
  confirmationOf,
  reminderKey,
  reminderOf,
} from "#billing/domain/reminders.ts";
import type { Reminder } from "#billing/domain/reminders.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { BillingNotices } from "./ports/billing-notices.ts";
import { Subscriptions } from "./ports/subscriptions.ts";

const noticeOf = (reminder: Reminder): BillingNotice => {
  const { subscription } = reminder;

  return Match.valueTags(reminder, {
    renewal: ({ renewsAt }): BillingNotice => ({
      _tag: "SubscriptionRenewing",
      plan: subscription.plan,
      price: { amount: priceOf(subscription.plan, "year"), currency },
      renewsAt,
    }),
    started: ({ startedAt }): BillingNotice => ({
      _tag: "SubscriptionStarted",
      interval: subscription.interval,
      plan: subscription.plan,
      price: {
        amount: priceOf(subscription.plan, subscription.interval),
        currency,
      },
      startedAt,
      trialEnd:
        subscription.status === "trialing"
          ? subscription.trialEnd
          : Option.none(),
    }),
    trialEnding: ({ endsAt }): BillingNotice => ({
      _tag: "TrialEnding",
      endsAt,
      plan: subscription.plan,
    }),
  });
};

/**
 * Tells the members who manage billing, once each: that a subscription
 * started, the confirmation of the contract on a durable medium (CRD art.
 * 8(7)); that a trial ends in three days; and that a yearly plan renews in
 * about 45 days, so between one and three months before (Code de la
 * consommation L215-1), with its price and how to cancel. Runs hourly, on
 * the `billing.reminders` cron; says how many it told. A server that does
 * not bill tells nothing.
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

        yield* Effect.forEach(
          due,
          (reminder) =>
            notices.tell({
              key: reminderKey(reminder),
              notice: noticeOf(reminder),
              workspaceId: reminder.subscription.workspaceId,
            }),
          { discard: true }
        );

        return due.length;
      }).pipe(Effect.withSpan("SendBillingReminders.run"));

      return SendBillingReminders.of({ run });
    })
  );
}
