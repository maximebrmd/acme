import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Schema,
} from "effect";

import type { BillingInterval } from "#billing/domain/billing-interval.ts";
import { OrderRequired } from "#billing/domain/order-required.ts";
import { orderLifetimeMinutes, OrderIdSchema } from "#billing/domain/order.ts";
import { allowancesOf } from "#billing/domain/plans.ts";
import { excessesOf, mustReduce } from "#billing/domain/standing.ts";
import { TrialUnavailable } from "#billing/domain/trial-unavailable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { Orders } from "./ports/orders.ts";
import { PlanHolders } from "./ports/plan-holders.ts";
import { UsageAtCheckout } from "./ports/usage-at-checkout.ts";

const decodeOrderId = Schema.decodeUnknownOption(OrderIdSchema);

/** What a checkout is about to start. */
export interface CheckoutRequest {
  /** The member's email address, as their session has it. */
  readonly email: string;
  readonly interval: BillingInterval;
  /** As the checkout's metadata names it: no order has another shape. */
  readonly orderId: string;
  readonly plan: PaidPlan;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
}

/**
 * How the checkout starts: with a trial's days, or paid at once. No trial
 * is offered any more: always paid at once.
 */
export interface CheckoutTerms {
  readonly trialDays: Option.Option<number>;
}

/**
 * Lets a checkout start only for an order the same member placed on the
 * billing page for the same workspace, plan and interval, within 30
 * minutes, once: the order records their consent and what they were shown.
 * A workspace that has outgrown the plan since the order starts none.
 * Only per-account pricing is sold: an order for a legacy plan, or for a
 * trial, placed before it was, starts no checkout.
 */
export class CheckoutOrders extends Context.Service<
  CheckoutOrders,
  {
    readonly take: (
      request: CheckoutRequest
    ) => Effect.Effect<
      CheckoutTerms,
      DatabaseError | OrderRequired | TrialUnavailable
    >;
  }
>()("peal-server/billing/application/CheckoutOrders") {
  static readonly layer = Layer.effect(
    CheckoutOrders,
    Effect.gen(function* CheckoutOrdersLive() {
      const orders = yield* Orders;
      const usage = yield* UsageAtCheckout;
      const holders = yield* PlanHolders;

      const take = Effect.fn("CheckoutOrders.take")(function* take(
        request: CheckoutRequest
      ) {
        const id = decodeOrderId(request.orderId);

        if (Option.isNone(id)) {
          return yield* new OrderRequired();
        }

        const now = yield* DateTime.now;

        const since = DateTime.subtractDuration(
          now,
          Duration.minutes(orderLifetimeMinutes)
        );

        const order = yield* orders.take(
          {
            id: id.value,
            interval: request.interval,
            plan: request.plan,
            userId: request.userId,
            workspaceId: request.workspaceId,
          },
          since,
          now
        );

        if (Option.isNone(order)) {
          return yield* new OrderRequired();
        }

        // Ordered while the workspace billed its account: handed over or
        // joined to another since, it orders nothing more.
        if (
          (yield* holders.holderOf(request.workspaceId)) !== request.workspaceId
        ) {
          return yield* new OrderRequired();
        }

        // No trial and no legacy plan is sold.
        if (order.value.trial) {
          return yield* new TrialUnavailable({ reason: "notOffered" });
        }

        if (request.plan !== "payAsYouGo") {
          return yield* new OrderRequired();
        }

        // Never above the plan ordered: what the workspace holds is
        // counted again, as it may have grown since the order. The order
        // no longer stands; placed again, it says what to remove first.
        const counted = yield* usage.of(request.workspaceId);

        if (
          Option.isNone(counted) ||
          mustReduce(
            excessesOf(
              allowancesOf(request.plan, {
                accounts: counted.value.channels,
                freeTier: true,
              }),
              counted.value
            )
          )
        ) {
          return yield* new OrderRequired();
        }

        const paid: CheckoutTerms = { trialDays: Option.none() };

        return paid;
      });

      return CheckoutOrders.of({ take });
    })
  );
}
