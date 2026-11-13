import { Context, DateTime, Effect, Layer, Match, Option } from "effect";

import type { BillingAccountId } from "#billing/domain/billing-account.ts";
import type {
  BillingNotice,
  Money,
  NoticeRates,
} from "#billing/domain/billing-notice.ts";
import { allowancesOf } from "#billing/domain/plans.ts";
import { currency, listedPriceOf } from "#billing/domain/prices.ts";
import { freeAccountsOf, rateCard } from "#billing/domain/rate-card.ts";
import {
  confirmationOf,
  reminderKey,
  reminderOf,
} from "#billing/domain/reminders.ts";
import type { Reminder } from "#billing/domain/reminders.ts";
import { excessesOf, gracedHolds } from "#billing/domain/standing.ts";
import type { Excess } from "#billing/domain/standing.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { BillingMode, inGrace } from "./ports/billing-mode.ts";
import { BillingNotices } from "./ports/billing-notices.ts";
import { ContractReferences } from "./ports/contract-references.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

// Per-account pricing's rates, as its confirmation states them: the rate
// card's, in US dollars.
const perAccountRates: NoticeRates = {
  bands: rateCard.prices.usd.accounts.bands,
  currency: "usd",
  freeAccounts: freeAccountsOf(rateCard),
};

// Billing accounts read at a time when the grace's notices are sent.
const gracePage = 200;

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
      started: () => {
        // Per-account pricing charges nothing at the start: its rates
        // stand for the price.
        if (subscription.plan === "payAsYouGo") {
          return Effect.succeed(
            Option.some<Money>({ amount: 0, currency: "usd" })
          );
        }

        // A trial charges nothing either: it shows the plan's price,
        // excluding VAT, which an order would cost.
        return subscription.status === "trialing"
          ? Effect.succeed(
              listedPriceOf(subscription.plan, subscription.interval).pipe(
                Option.map((amount): Money => ({ amount, currency }))
              )
            )
          : stripe
              .paidInvoices(workspaceId, id)
              .pipe(
                Effect.map((invoices) =>
                  Option.fromUndefinedOr(invoices.at(-1)).pipe(
                    Option.map(({ paid }) => paid)
                  )
                )
              );
      },
      // The notice names no price.
      trialEnding: () =>
        Effect.succeed(Option.some<Money>({ amount: 0, currency })),
    });
  });

// What the workspace holds beyond the free tier, which it moves to when
// its trial ends: nothing for the other reminders, which read nothing.
const overFreePlan = (reminder: Reminder) =>
  reminder._tag === "trialEnding"
    ? WorkspaceUsage.use((usage) =>
        usage.of(reminder.subscription.workspaceId)
      ).pipe(
        Effect.map((held) =>
          excessesOf(
            allowancesOf("free", { accounts: held.channels, freeTier: true }),
            held
          )
        )
      )
    : Effect.succeed<readonly Excess[]>([]);

const noticeOf = (
  reminder: Reminder,
  price: Money,
  reference: string,
  over: readonly Excess[]
): BillingNotice => {
  const { subscription } = reminder;

  return Match.valueTags(reminder, {
    renewal: ({ renewsAt }): BillingNotice => ({
      _tag: "SubscriptionRenewing",
      plan: subscription.plan,
      price,
      reference,
      renewsAt,
    }),
    started: ({ startedAt }): BillingNotice => {
      const confirmed: BillingNotice = {
        _tag: "SubscriptionStarted",
        interval: subscription.interval,
        plan: subscription.plan,
        price,
        reference,
        startedAt,
        trialEnd:
          subscription.status === "trialing"
            ? subscription.trialEnd
            : Option.none(),
      };

      // Per-account pricing states its rates, which stand for a price.
      return subscription.plan === "payAsYouGo"
        ? { ...confirmed, rates: perAccountRates }
        : confirmed;
    },
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
 * consommation L215-1), with its price and how to cancel. The confirmation
 * and the renewal give the contract's number, which cancels or withdraws
 * without signing in. The price is
 * what Stripe charges, taxes included: the first paid invoice's for a
 * confirmation, the next invoice's for a renewal; a notice Stripe cannot
 * price yet, or cannot be asked for, waits for the next run. Runs hourly,
 * on the `billing.reminders` cron; says how many it told. A server that
 * does not bill tells nothing. While the billing grace runs
 * (PEAL_BILLING_GRACE_UNTIL), each billing account on the free tier that
 * holds more accounts than it includes is told once, on its billing
 * workspace (`PaymentMethodNeeded`, with the grace's day), its accounts
 * read a page at a time.
 */
export class SendBillingReminders extends Context.Service<
  SendBillingReminders,
  { readonly run: Effect.Effect<number, DatabaseError> }
>()("peal-server/billing/application/SendBillingReminders") {
  static readonly layer = Layer.effect(
    SendBillingReminders,
    Effect.gen(function* SendBillingRemindersLive() {
      const { enabled, graceSince, graceUntil } = yield* BillingMode;
      const subscriptions = yield* Subscriptions;
      const accounts = yield* BillingAccountStore;
      const entitlements = yield* WorkspaceEntitlements;
      const notices = yield* BillingNotices;
      const references = yield* ContractReferences;
      const context = yield* Effect.context<StripeContracts | WorkspaceUsage>();

      // The billing workspaces on the free tier over its accounts, told
      // once each for the grace's day.
      const askForPaymentMethods = Effect.fn(
        "SendBillingReminders.askForPaymentMethods"
      )(function* askForPaymentMethods(
        until: DateTime.Utc,
        since: DateTime.Utc
      ) {
        let after = Option.none<BillingAccountId>();
        let over = 0;
        let more = true;

        while (more) {
          const page = yield* accounts.page(after, gracePage);
          const holders = [...new Set(page.map(({ holder }) => holder))];

          const [plans, held, before] = yield* Effect.all([
            entitlements.ofEach(holders),
            WorkspaceUsage.use((usage) => usage.heldIn(holders)).pipe(
              Effect.provide(context)
            ),
            WorkspaceUsage.use((usage) => usage.heldIn(holders, since)).pipe(
              Effect.provide(context)
            ),
          ]);

          for (const holder of holders) {
            const plan = plans.get(holder);
            const accountsHeld = held.get(holder)?.channels ?? 0;

            // The free tier staff did not take away, over its accounts,
            // on accounts connected before the grace started: what the
            // grace keeps publishing.
            const allowed =
              plan !== undefined &&
              Option.contains(plan.plan, "free") &&
              plan.freeTier
                ? Option.getOrUndefined(plan.allowanceOf("channels"))
                : undefined;

            if (
              allowed !== undefined &&
              accountsHeld > allowed &&
              gracedHolds(
                allowed,
                accountsHeld,
                before.get(holder)?.channels ?? 0
              )
            ) {
              yield* notices.tell({
                key: `billing:${holder}:payment-method-needed:${until.epochMilliseconds}`,
                notice: {
                  _tag: "PaymentMethodNeeded",
                  accounts: accountsHeld,
                  allowed,
                  graceUntil: until,
                },
                workspaceId: holder,
              });
              over += 1;
            }
          }

          more = page.length === gracePage;
          after = Option.fromUndefinedOr(page.at(-1)?.id);
        }

        // Each is told once, by its key: the count is of those graced.
        yield* Effect.logInfo(
          "Billing accounts the grace keeps publishing"
        ).pipe(Effect.annotateLogs({ over }));
      });

      const run = Effect.gen(function* run() {
        if (!enabled) {
          return 0;
        }

        const now = yield* DateTime.now;

        // A failure here never holds back the reminders below, which the
        // law asks for.
        if (
          Option.isSome(graceUntil) &&
          Option.isSome(graceSince) &&
          inGrace(graceUntil, now)
        ) {
          yield* askForPaymentMethods(graceUntil.value, graceSince.value).pipe(
            Effect.catchCause((cause) =>
              Effect.logError(
                "The billing grace's notices could not be sent: the next run tries again",
                cause
              )
            )
          );
        }

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
                    // The contract's number, which its confirmation and
                    // its reminder give, and what a trial's end leaves
                    // beyond the free plan.
                    Effect.all({
                      over: overFreePlan(reminder).pipe(
                        Effect.provide(context)
                      ),
                      reference: references.issue({
                        stripeSubscriptionId:
                          reminder.subscription.stripeSubscriptionId,
                        workspaceId: reminder.subscription.workspaceId,
                      }),
                    }).pipe(
                      Effect.flatMap(({ over, reference }) =>
                        notices.tell({
                          key: reminderKey(reminder),
                          notice: noticeOf(reminder, charged, reference, over),
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
