import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { BillingInterval } from "#billing/domain/billing-interval.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import { entitlementsOf } from "#billing/domain/entitlements.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import { consentVersion, Order, OrderIdSchema } from "#billing/domain/order.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { trialPlan } from "#billing/domain/plans.ts";
import { TrialUnavailable } from "#billing/domain/trial-unavailable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { Orders } from "./ports/orders.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { Trials } from "./ports/trials.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** What a member orders. */
export interface OrderRequest {
  readonly interval: BillingInterval;
  readonly plan: PaidPlan;
  /** The trial of `trialPlan`, monthly, rather than a paid order. */
  readonly trial: boolean;
}

/**
 * Whether the workspace and the account may still start a trial: neither
 * started one, and the workspace never had a subscription.
 */
export const trialOpen = Effect.fn("Billing.trialOpen")(function* trialOpen(
  userId: UserId,
  workspaceId: WorkspaceId
) {
  const held = yield* Subscriptions.use((subscriptions) =>
    subscriptions.ofWorkspace(workspaceId)
  );

  if (held.length > 0) {
    return false;
  }

  return !(yield* Trials.use((trials) => trials.used(userId, workspaceId)));
});

/**
 * Records what a member orders on the billing page, before Stripe's
 * checkout: the plan and interval, or the trial, with the consent they
 * gave to start at once, knowing their right to withdraw (the API refuses
 * an order without it). Checkout then requires it. Ordering a paid plan
 * while the workspace is in its trial ends the trial at once, nothing
 * charged: the paid contract starts with the checkout. Needs billing:manage
 * and the member in person.
 */
export class PlaceOrder extends Context.Service<
  PlaceOrder,
  {
    readonly place: (
      actor: Actor,
      request: OrderRequest
    ) => Effect.Effect<
      Order,
      | BillingOff
      | DatabaseError
      | MissingPermission
      | PersonRequired
      | StripeUnreachable
      | TrialUnavailable
    >;
  }
>()("peal-server/billing/application/PlaceOrder") {
  static readonly layer = Layer.effect(
    PlaceOrder,
    Effect.gen(function* PlaceOrderLive() {
      const { enabled } = yield* BillingMode;
      const orders = yield* Orders;
      const stripe = yield* StripeContracts;
      const context = yield* Effect.context<Ids | Subscriptions | Trials>();

      const place = Effect.fn("PlaceOrder.place")(function* place(
        actor: Actor,
        request: OrderRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "billing:manage"));

        const userId = yield* Effect.fromResult(inPerson(actor));
        const { workspaceId } = actor;

        if (!enabled) {
          return yield* new BillingOff();
        }

        if (request.trial) {
          if (request.plan !== trialPlan || request.interval !== "month") {
            return yield* new TrialUnavailable({ reason: "notOffered" });
          }

          if (!(yield* trialOpen(userId, workspaceId))) {
            return yield* new TrialUnavailable({ reason: "used" });
          }
        } else {
          const held = yield* Subscriptions.use((subscriptions) =>
            subscriptions.ofWorkspace(workspaceId)
          );

          const current = entitlementsOf(held).subscription.pipe(
            Option.filter(({ status }) => status === "trialing")
          );

          if (Option.isSome(current)) {
            yield* stripe.endNow(
              workspaceId,
              current.value.stripeSubscriptionId,
              "orderedDuringTrial"
            );
          }
        }

        const order = new Order({
          consentVersion,
          createdAt: yield* DateTime.now,
          id: yield* newId(OrderIdSchema),
          interval: request.interval,
          plan: request.plan,
          trial: request.trial,
          userId,
          workspaceId,
        });

        yield* orders.place(order);

        return order;
      }, Effect.provide(context));

      return PlaceOrder.of({ place });
    })
  );
}
