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
import { trialDays } from "#billing/domain/plans.ts";
import { TrialUnavailable } from "#billing/domain/trial-unavailable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { trialOpen } from "./place-order.ts";
import { Orders } from "./ports/orders.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import type { Trials } from "./ports/trials.ts";

const decodeOrderId = Schema.decodeUnknownOption(OrderIdSchema);

/** What a checkout is about to start. */
export interface CheckoutRequest {
  readonly interval: BillingInterval;
  /** As the checkout's metadata names it: no order has another shape. */
  readonly orderId: string;
  readonly plan: PaidPlan;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
}

/** How the checkout starts: with the trial's days, or paid at once. */
export interface CheckoutTerms {
  readonly trialDays: Option.Option<number>;
}

/**
 * Lets a checkout start only for an order the same member placed on the
 * billing page for the same workspace, plan and interval, within 30
 * minutes, once: the order records their consent and what they were shown.
 * An order for the trial starts the checkout with its days, if the
 * workspace and the account still have it.
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
      const context = yield* Effect.context<Subscriptions | Trials>();

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

        if (!order.value.trial) {
          const paid: CheckoutTerms = { trialDays: Option.none() };

          return paid;
        }

        if (!(yield* trialOpen(request.userId, request.workspaceId))) {
          return yield* new TrialUnavailable({ reason: "used" });
        }

        const trial: CheckoutTerms = { trialDays: Option.some(trialDays) };

        return trial;
      }, Effect.provide(context));

      return CheckoutOrders.of({ take });
    })
  );
}
