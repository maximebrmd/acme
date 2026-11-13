import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { BillingInterval } from "#billing/domain/billing-interval.ts";
import { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import type { SubscriptionStatus } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { Checkouts } from "./ports/checkouts.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import type { RecordOutcome } from "./ports/subscriptions.ts";
import { Trials } from "./ports/trials.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

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

// Whether Stripe already ends the trial, cancelled, when it ends.
const endsWithTrial = (event: SubscriptionEvent, trialEnd: DateTime.Utc) =>
  Option.exists(event.cancelAt, (at) =>
    DateTime.isLessThanOrEqualTo(at, trialEnd)
  );

// A paid subscription that gives its plan, as one ordered during a trial.
const paidFor = (status: SubscriptionStatus) =>
  status === "active" || status === "past_due";

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

        // The paid plan ordered during the trial now runs: the trial ends.
        if (outcome !== "ignored" && paidFor(recorded.status)) {
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

        // A plan of the workspace's own keeps it alone on it; once that
        // ends it joins its payer's account.
        if (outcome !== "ignored") {
          yield* accounts.subscriptionChanged(recorded.workspaceId);
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
