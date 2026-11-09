import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { Money } from "#billing/domain/billing-notice.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { currency } from "#billing/domain/prices.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { WithdrawalUnavailable } from "#billing/domain/withdrawal-unavailable.ts";
import { mayWithdraw, refundOf } from "#billing/domain/withdrawal.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { currentSubscription } from "./current-subscription.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { BillingNotices } from "./ports/billing-notices.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import type { PeriodPayment } from "./ports/stripe-contracts.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import { Withdrawals } from "./ports/withdrawals.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** What withdrawing would do now, for the member to confirm. */
export interface WithdrawalPreview {
  /** Until when the member may withdraw. */
  readonly endsAt: DateTime.Utc;
  readonly plan: PaidPlan;
  /** What would be refunded now. */
  readonly refund: Money;
  readonly startedAt: DateTime.Utc;
}

/** What withdrawing did. */
export interface WithdrawalDone {
  readonly plan: PaidPlan;
  readonly refunded: Money;
  readonly withdrawnAt: DateTime.Utc;
}

type WithdrawalFailure =
  | BillingOff
  | DatabaseError
  | MissingPermission
  | PersonRequired
  | StripeUnreachable
  | WithdrawalUnavailable;

const nothing: Money = { amount: 0, currency };

/**
 * A consumer's withdrawal from the workspace's subscription within 14
 * days of the contract (EU Consumer Rights Directive art. 9 and 11a; Code
 * de la consommation L221-18 and following), in two steps: what it would
 * do (`preview`), then doing it (`confirm`). It ends the subscription at
 * once and refunds what was paid for the rest of the period, to the second,
 * within the 14 days the law gives. A customer who gave a VAT number
 * Stripe verified buys as a business and cannot. Needs billing:manage and
 * the member in person.
 */
export class Withdraw extends Context.Service<
  Withdraw,
  {
    readonly preview: (
      actor: Actor
    ) => Effect.Effect<WithdrawalPreview, WithdrawalFailure>;
    readonly confirm: (
      actor: Actor
    ) => Effect.Effect<WithdrawalDone, WithdrawalFailure>;
  }
>()("peal-server/billing/application/Withdraw") {
  static readonly layer = Layer.effect(
    Withdraw,
    Effect.gen(function* WithdrawLive() {
      const { enabled } = yield* BillingMode;
      const stripe = yield* StripeContracts;
      const withdrawals = yield* Withdrawals;
      const notices = yield* BillingNotices;
      const context = yield* Effect.context<Subscriptions>();

      // The subscription the actor may withdraw from now, with what it
      // took and what goes back.
      const withdrawable = Effect.fn("Withdraw.withdrawable")(
        function* withdrawable(actor: Actor) {
          yield* Effect.fromResult(authorize(actor, "billing:manage"));

          const userId = yield* Effect.fromResult(inPerson(actor));

          if (!enabled) {
            return yield* new BillingOff();
          }

          const { workspaceId } = actor;
          const now = yield* DateTime.now;
          const current = yield* currentSubscription(workspaceId);

          if (Option.isNone(current)) {
            return yield* new WithdrawalUnavailable({
              reason: "notSubscribed",
            });
          }

          const subscription: Subscription = current.value;

          const endsAt = yield* Effect.fromResult(
            mayWithdraw(subscription, now)
          );

          if (
            yield* stripe.isBusiness(workspaceId, subscription.stripeCustomerId)
          ) {
            return yield* new WithdrawalUnavailable({ reason: "business" });
          }

          const payment: Option.Option<PeriodPayment> =
            subscription.status === "trialing"
              ? Option.none()
              : yield* stripe.latestPayment(
                  workspaceId,
                  subscription.stripeSubscriptionId
                );

          const refund = Option.match(payment, {
            onNone: () => nothing,
            onSome: ({ paid }): Money => ({
              amount: Option.match(
                Option.all({
                  end: subscription.currentPeriodEnd,
                  start: subscription.currentPeriodStart,
                }),
                {
                  // Without its period, the whole payment goes back.
                  onNone: () => paid.amount,
                  onSome: ({ end, start }) =>
                    refundOf({ end, paid: paid.amount, start }, now),
                }
              ),
              currency: paid.currency,
            }),
          });

          return { endsAt, now, payment, refund, subscription, userId };
        },
        Effect.provide(context)
      );

      const preview = Effect.fn("Withdraw.preview")(function* preview(
        actor: Actor
      ) {
        const found = yield* withdrawable(actor);

        const shown: WithdrawalPreview = {
          endsAt: found.endsAt,
          plan: found.subscription.plan,
          refund: found.refund,
          startedAt: Option.getOrElse(
            found.subscription.startedAt,
            () => found.now
          ),
        };

        return shown;
      });

      const confirm = Effect.fn("Withdraw.confirm")(function* confirm(
        actor: Actor
      ) {
        const found = yield* withdrawable(actor);
        const { subscription } = found;
        const { workspaceId } = actor;
        const id = subscription.stripeSubscriptionId;

        // Recorded first: a withdrawal tried again refunds what the first
        // try computed, under the same idempotency key.
        const recorded = yield* withdrawals.record({
          refunded: found.refund,
          requestedAt: found.now,
          stripeSubscriptionId: id,
          userId: found.userId,
          workspaceId,
        });

        if (Option.isSome(found.payment) && recorded.refunded.amount > 0) {
          yield* stripe.refund(
            workspaceId,
            id,
            found.payment.value,
            recorded.refunded.amount
          );
        }

        yield* stripe.endNow(workspaceId, id, "withdrawn");

        const done: WithdrawalDone = {
          plan: subscription.plan,
          refunded: recorded.refunded,
          withdrawnAt: recorded.requestedAt,
        };

        yield* notices.tell({
          key: `subscription:${id}:withdrawn`,
          notice: { _tag: "SubscriptionWithdrawn", ...done },
          workspaceId,
        });

        yield* Effect.logInfo("A consumer withdrew from a subscription").pipe(
          Effect.annotateLogs({
            plan: subscription.plan,
            refunded: recorded.refunded.amount,
            workspaceId,
          })
        );

        return done;
      });

      return Withdraw.of({ confirm, preview });
    })
  );
}
