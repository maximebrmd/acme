import {
  Context,
  DateTime,
  Effect,
  Layer,
  Metric,
  Option,
  Schema,
} from "effect";

import { unverifiedThreshold } from "#billing/domain/account-days.ts";
import type { BillingInterval } from "#billing/domain/billing-interval.ts";
import { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import { billsAt, entitles } from "#billing/domain/subscription.ts";
import type {
  Subscription,
  SubscriptionStatus,
} from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { AccountDays } from "./account-days.ts";
import { BillingAccounts } from "./billing-accounts.ts";
import { Checkouts } from "./ports/checkouts.ts";
import { CreditProblems } from "./ports/credit-problems.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import type { RecordOutcome } from "./ports/subscriptions.ts";
import { Trials } from "./ports/trials.ts";
import { UsageBilling } from "./ports/usage-billing.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";
import { movedCredits } from "./unused-time.ts";

/** What a Stripe webhook event says of a workspace's subscription. */
export interface SubscriptionEvent {
  /** When Stripe is set to cancel it, if it is. */
  readonly cancelAt: Option.Option<DateTime.Utc>;
  readonly cancelAtPeriodEnd: boolean;
  readonly currentPeriodEnd: Option.Option<DateTime.Utc>;
  readonly currentPeriodStart: Option.Option<DateTime.Utc>;
  readonly eventId: string;
  /** How often it is paid for; null with `plan`. */
  readonly interval: BillingInterval | null;
  readonly occurredAt: DateTime.Utc;
  /**
   * The plan its price buys; null when its price is none this server
   * lists now, as for the subscribers of a price since replaced: it stays
   * on the plan recorded for it.
   */
  readonly plan: PaidPlan | null;
  /** The member whose checkout started it, as its metadata names them. */
  readonly startedBy: Option.Option<UserId>;
  readonly startedAt: Option.Option<DateTime.Utc>;
  /** Stripe's status, which may be one this server does not know yet. */
  readonly status: string;
  readonly stripeCustomerId: string;
  readonly stripeSubscriptionId: string;
  readonly trialEnd: Option.Option<DateTime.Utc>;
  readonly workspaceId: WorkspaceId;
}

/** What recording an event did, `ignored` for one billing cannot read. */
export type RecordedEvent = RecordOutcome | "ignored";

const decodeChange = Schema.decodeUnknownOption(SubscriptionChange);

/**
 * The second per-account subscriptions of one billing account ended: a
 * customer who paid twice and holds two confirmations, which someone must
 * answer. An alert rule reads it (peal-duplicate-subscription).
 */
export const duplicateSubscriptions = Metric.counter(
  "peal.billing.duplicate_subscriptions",
  {
    description:
      "Second per-account subscriptions of one billing account, ended when recorded",
    incremental: true,
  }
);

/**
 * Money owed back that Stripe did not give (a credit it refused for good,
 * a refund it reported failed), kept for staff: an alert rule reads it
 * (peal-credit-problems).
 */
export const creditProblemsCount = Metric.counter(
  "peal.billing.credit_problems",
  {
    description:
      "Credits Stripe refused for good and refunds it reported failed, kept for staff to settle",
    incremental: true,
  }
);

/**
 * Per-account subscriptions recorded without the threshold they invoice
 * at until a first paid invoice, because Stripe refused to set it: the
 * daily step tries again, and an alert rule reads it
 * (peal-threshold-unset).
 */
export const thresholdsUnset = Metric.counter("peal.billing.threshold_unset", {
  description:
    "Per-account subscriptions Stripe refused the unverified billing threshold to, recorded without it",
  incremental: true,
});

// Whether Stripe already ends the trial, cancelled, when it ends.
const endsWithTrial = (event: SubscriptionEvent, trialEnd: DateTime.Utc) =>
  Option.exists(event.cancelAt, (at) =>
    DateTime.isLessThanOrEqualTo(at, trialEnd)
  );

// A paid subscription that gives its plan, as one ordered during a trial.
const paidFor = (status: SubscriptionStatus) =>
  status === "active" || status === "past_due";

// The order subscriptions started in, the earliest first; one without a
// start last, then by id, so every server keeps the same one.
const startOf = (held: Subscription): number =>
  Option.match(held.startedAt, {
    onNone: () => Number.POSITIVE_INFINITY,
    onSome: (at) => at.epochMilliseconds,
  });

const byStart = (left: Subscription, right: Subscription): number =>
  startOf(left) - startOf(right) ||
  left.stripeSubscriptionId.localeCompare(right.stripeSubscriptionId);

/**
 * Keeps a workspace's subscriptions as Stripe's webhook events describe
 * them: what the workspace's entitlements follow. Better Auth's Stripe
 * webhook calls it once the event's signature is checked. A database
 * failure is reported, so the webhook answers an error and Stripe sends
 * the event again later; an event this server cannot read, as with a status
 * Stripe added since, is logged and ignored, since sending it again would
 * change nothing. An event about a workspace deleted meanwhile is ignored.
 * A subscription in its trial records the trial too, so neither the
 * workspace nor the member who started it gets another: a second trial of
 * either, as from two checkouts started together, is ended at once. A
 * trial is set first to end, cancelled, with its trial, so a payment method
 * added in Stripe's portal never turns it into a charge. A paid
 * subscription that starts ends the trial the workspace was in.
 */
export class RecordSubscription extends Context.Service<
  RecordSubscription,
  {
    readonly record: (
      event: SubscriptionEvent
    ) => Effect.Effect<RecordedEvent, DatabaseError | StripeUnreachable>;
  }
>()("peal-server/billing/application/RecordSubscription") {
  static readonly layer = Layer.effect(
    RecordSubscription,
    Effect.gen(function* RecordSubscriptionLive() {
      const subscriptions = yield* Subscriptions;
      const checkouts = yield* Checkouts;
      const trials = yield* Trials;
      const stripe = yield* StripeContracts;
      const { transaction } = yield* TransactionRunner;
      const accounts = yield* BillingAccounts;
      const usage = yield* UsageBilling;
      const days = yield* AccountDays;
      const problems = yield* CreditProblems;

      // A per-account subscription paid for the first time invoices at a
      // threshold until its first invoice is paid, which the reporter's
      // daily step then lifts.
      const thresholdOnce = Effect.fn("RecordSubscription.thresholdOnce")(
        function* thresholdOnce(recorded: Subscription) {
          const before = (yield* subscriptions.ofWorkspace(
            recorded.workspaceId
          )).find(
            ({ stripeSubscriptionId }) =>
              stripeSubscriptionId === recorded.stripeSubscriptionId
          );

          if (
            before === undefined ||
            (!paidFor(before.status) && Option.isNone(before.paidInvoiceAt))
          ) {
            // Refused for good, the subscription is recorded all the same:
            // the account ceiling holds without it, and the daily step
            // tries again. Not answered, the webhook fails and comes back.
            yield* usage
              .setThreshold(
                recorded.workspaceId,
                recorded.stripeSubscriptionId,
                Option.some(unverifiedThreshold)
              )
              .pipe(
                Effect.catchIf(
                  ({ permanent }) => permanent,
                  () =>
                    Metric.update(thresholdsUnset, 1).pipe(
                      Effect.andThen(
                        Effect.logError(
                          "Stripe refused the unverified billing threshold: the subscription is recorded without it"
                        ).pipe(
                          Effect.annotateLogs({
                            workspaceId: recorded.workspaceId,
                          })
                        )
                      )
                    )
                )
              );
          }
        }
      );

      // Whether the subscription the event is about gives its plan as the
      // database now holds it: a stale or resent event's status is not.
      const storedOf = (recorded: Subscription) =>
        subscriptions
          .ofWorkspace(recorded.workspaceId)
          .pipe(
            Effect.map((held) =>
              Option.fromUndefinedOr(
                held.find(
                  ({ stripeSubscriptionId }) =>
                    stripeSubscriptionId === recorded.stripeSubscriptionId
                )
              )
            )
          );

      const paidNow = (recorded: Subscription) =>
        storedOf(recorded).pipe(
          Effect.map(Option.exists(({ status }) => paidFor(status)))
        );

      const paysNow = (recorded: Subscription) =>
        storedOf(recorded).pipe(
          Effect.map(
            Option.exists(
              ({ plan, status }) => plan === "payAsYouGo" && paidFor(status)
            )
          )
        );

      // Credits a legacy plan's unused time after `at`, once per invoice.
      // A credit Stripe refuses for good is kept for staff, counted for
      // the alert, and never stops what follows.
      const creditUnused = Effect.fn("RecordSubscription.creditUnused")(
        function* creditUnused(
          legacy: Subscription,
          at: DateTime.Utc,
          reason: { readonly _tag: "movedToRateCard" | "retirement" }
        ) {
          const { stripeSubscriptionId, workspaceId } = legacy;

          const invoices = yield* stripe.paidInvoices(
            workspaceId,
            stripeSubscriptionId
          );

          const credits = movedCredits(invoices, at);

          yield* stripe
            .credit(workspaceId, stripeSubscriptionId, credits, reason)
            .pipe(
              Effect.catchIf(
                ({ permanent }) => permanent,
                (refused) =>
                  Effect.gen(function* keptForStaff() {
                    const fresh = yield* problems.record({
                      amount: credits.reduce(
                        (sum, { amount }) => sum + amount,
                        0
                      ),
                      code: Option.fromUndefinedOr(refused.code),
                      currency: invoices[0]?.paid.currency ?? "eur",
                      key: `credit:${stripeSubscriptionId}:${reason._tag}`,
                      kind: "creditRefused",
                      occurredAt: yield* DateTime.now,
                      reason: Option.some(reason._tag),
                      refundId: Option.none(),
                      stripeSubscriptionId: Option.some(stripeSubscriptionId),
                      workspaceId: Option.some(workspaceId),
                    });

                    if (fresh) {
                      yield* Metric.update(creditProblemsCount, 1);
                    }

                    yield* Effect.logError(
                      "Stripe refused for good to credit a legacy plan's unused time: kept for staff"
                    ).pipe(
                      Effect.annotateLogs({
                        code: refused.code ?? "",
                        stripeSubscriptionId,
                        workspaceId,
                      })
                    );
                  })
              )
            );
        }
      );

      const record = Effect.fn("RecordSubscription.record")(function* record(
        event: SubscriptionEvent
      ) {
        const { eventId, occurredAt, startedBy, ...described } = event;

        // A price this server no longer lists: the plan and the interval
        // recorded for the subscription stand, so its cancellation, or a
        // payment that failed, is still followed. One never recorded is
        // none of this server's: it is left alone, and said so loudly.
        const priced =
          described.plan === null || described.interval === null
            ? (yield* subscriptions.ofWorkspace(event.workspaceId)).find(
                ({ stripeSubscriptionId }) =>
                  stripeSubscriptionId === event.stripeSubscriptionId
              )
            : { interval: described.interval, plan: described.plan };

        if (priced === undefined) {
          yield* Effect.logError(
            "A subscription's price is none this server lists, and billing never recorded it: its workspace's plan does not follow it"
          ).pipe(
            Effect.annotateLogs({ eventId, workspaceId: event.workspaceId })
          );

          const unpriced: RecordedEvent = "ignored";

          return unpriced;
        }

        const subscription = {
          ...described,
          interval: priced.interval,
          plan: priced.plan,
        };

        const change = decodeChange({ eventId, occurredAt, subscription });

        if (Option.isNone(change)) {
          yield* Effect.logWarning(
            "Ignored a subscription event billing cannot read"
          ).pipe(Effect.annotateLogs({ eventId, status: event.status }));

          const ignored: RecordedEvent = "ignored";

          return ignored;
        }

        const { value } = change;
        const { subscription: recorded } = value;

        // Before it is recorded: Stripe sends the event again until this
        // is done. A trial cannot turn into a charge.
        if (recorded.status === "trialing") {
          yield* Option.match(recorded.trialEnd, {
            onNone: () => Effect.void,
            onSome: (trialEnd) =>
              endsWithTrial(event, trialEnd)
                ? Effect.void
                : stripe.endAtTrialEnd(
                    recorded.workspaceId,
                    recorded.stripeSubscriptionId,
                    trialEnd
                  ),
          });
        }

        // Before it is recorded: Stripe sends the event again until this
        // is done.
        if (recorded.plan === "payAsYouGo" && paidFor(recorded.status)) {
          yield* thresholdOnce(recorded);
        }

        // Under the workspace's row: an event that comes while the
        // workspace is being deleted, as the one its cancellation sends,
        // waits, then finds it gone, and leaves no record behind.
        const { duplicateTrial, outcome } = yield* transaction(
          Effect.gen(function* recordHeld() {
            if (!(yield* checkouts.holdWorkspace(event.workspaceId))) {
              const gone: RecordedEvent = "ignored";

              return { duplicateTrial: false, outcome: gone };
            }

            const saved: RecordedEvent = yield* subscriptions.record(value);

            const accepted =
              recorded.status === "trialing" &&
              Option.isSome(recorded.trialEnd) &&
              Option.isSome(startedBy)
                ? yield* trials.record({
                    plan: recorded.plan,
                    startedAt: Option.getOrElse(
                      recorded.startedAt,
                      () => occurredAt
                    ),
                    stripeSubscriptionId: recorded.stripeSubscriptionId,
                    userId: startedBy.value,
                    workspaceId: recorded.workspaceId,
                  })
                : true;

            return { duplicateTrial: !accepted, outcome: saved };
          })
        );

        if (duplicateTrial) {
          yield* stripe.endNow(
            recorded.workspaceId,
            recorded.stripeSubscriptionId,
            "duplicateTrial"
          );

          yield* Effect.logWarning("Ended a second trial").pipe(
            Effect.annotateLogs({ workspaceId: recorded.workspaceId })
          );
        }

        // The paid plan ordered during the trial now runs, as its row says:
        // the trial ends.
        if (outcome !== "ignored" && (yield* paidNow(recorded))) {
          const held = yield* subscriptions.ofWorkspace(recorded.workspaceId);

          yield* Effect.forEach(
            held.filter(
              ({ status, stripeSubscriptionId }) =>
                status === "trialing" &&
                stripeSubscriptionId !== recorded.stripeSubscriptionId
            ),
            ({ stripeSubscriptionId }) =>
              stripe.endNow(
                recorded.workspaceId,
                stripeSubscriptionId,
                "orderedDuringTrial"
              ),
            { discard: true }
          );
        }

        // One per-account subscription per account: should a second one go
        // through (two checkouts finished before either was recorded), the
        // newer ends at once, unbilled, and the older is kept.
        if (outcome !== "ignored" && recorded.plan === "payAsYouGo") {
          const held = yield* subscriptions.ofWorkspace(recorded.workspaceId);

          const live = held
            .filter(
              ({ plan, status }) => plan === "payAsYouGo" && billsAt(status)
            )
            .toSorted(byStart);

          yield* Effect.forEach(
            live.slice(1),
            ({ stripeSubscriptionId }) =>
              stripe
                .endNow(
                  recorded.workspaceId,
                  stripeSubscriptionId,
                  "duplicateSubscription"
                )
                .pipe(
                  Effect.andThen(Metric.update(duplicateSubscriptions, 1)),
                  Effect.andThen(
                    Effect.logError(
                      "Ended a second per-account subscription of one billing account"
                    ).pipe(
                      Effect.annotateLogs({
                        kept: live[0]?.stripeSubscriptionId ?? "",
                        stripeSubscriptionId,
                        workspaceId: recorded.workspaceId,
                      })
                    )
                  )
                ),
            { discard: true }
          );
        }

        // The holder's day so far, counted while it did not pay, is
        // reported now; asked again, only what is left goes.
        if (
          outcome !== "ignored" &&
          recorded.plan === "payAsYouGo" &&
          paidFor(recorded.status)
        ) {
          yield* days.subscribed(recorded.workspaceId);
        }

        // A plan of the workspace's own keeps it alone on it; once that
        // ends it joins its payer's account.
        if (outcome !== "ignored") {
          yield* accounts.subscriptionChanged(recorded.workspaceId);
        }

        // Per-account pricing now runs, as the subscription's row says (a
        // late or resent event's own status never moves anything): a
        // legacy plan the workspace still pays for ends at once, set to
        // end with its period or not, and the part of its period not
        // supplied goes back to the payment method it was paid with,
        // through a credit note on each invoice (its own currency: a legacy
        // plan's euros cannot pay a dollar invoice), never more than is
        // still refundable of it. Computed at the moment per-account
        // pricing started, the same on every retry, each note under its
        // key, so it is credited once. A credit Stripe refuses for good is
        // kept for staff and counted, and the plan is ended all the same:
        // it must stop charging. Last, so a Stripe that does not answer
        // holds back nothing else of the event.
        if (outcome !== "ignored" && (yield* paysNow(recorded))) {
          const held = yield* subscriptions.ofWorkspace(recorded.workspaceId);

          const movedAt = Option.getOrElse(
            recorded.startedAt,
            () => occurredAt
          );

          yield* Effect.forEach(
            held.filter(
              (legacy) =>
                legacy.plan !== "payAsYouGo" &&
                legacy.status !== "trialing" &&
                entitles(legacy)
            ),
            (legacy) =>
              Effect.gen(function* moved() {
                const { stripeSubscriptionId } = legacy;

                yield* creditUnused(legacy, movedAt, {
                  _tag: "movedToRateCard",
                });

                yield* stripe.endNow(
                  recorded.workspaceId,
                  stripeSubscriptionId,
                  "movedToRateCard"
                );

                yield* Effect.logInfo(
                  "Ended a legacy plan moved to per-account pricing, its unused time credited"
                ).pipe(
                  Effect.annotateLogs({
                    stripeSubscriptionId,
                    workspaceId: recorded.workspaceId,
                  })
                );
              }),
            { discard: true }
          );
        }

        yield* Effect.logInfo("Recorded a subscription event").pipe(
          Effect.annotateLogs({
            eventId,
            outcome,
            plan: event.plan,
            status: event.status,
            workspaceId: event.workspaceId,
          })
        );

        return outcome;
      });

      return RecordSubscription.of({ record });
    })
  );
}
