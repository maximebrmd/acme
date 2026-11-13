import { Context, DateTime, Effect, Layer } from "effect";

import { BilledElsewhere } from "#billing/domain/billed-elsewhere.ts";
import type { BillingInterval } from "#billing/domain/billing-interval.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import { consentVersion, Order, OrderIdSchema } from "#billing/domain/order.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { PlanNotSold } from "#billing/domain/plan-not-sold.ts";
import { PlanTooSmall } from "#billing/domain/plan-too-small.ts";
import { allowancesOf } from "#billing/domain/plans.ts";
import {
  excessesOf,
  mustReduce,
  planHolding,
} from "#billing/domain/standing.ts";
import { TrialUnavailable } from "#billing/domain/trial-unavailable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { Orders } from "./ports/orders.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** What a member orders. */
export interface OrderRequest {
  readonly interval: BillingInterval;
  readonly plan: PaidPlan;
  /** A trial rather than a paid order: none is offered any more. */
  readonly trial: boolean;
}

/**
 * Records what a member orders on the billing page, before Stripe's
 * checkout: per-account pricing (`payAsYouGo`), monthly, the only plan
 * sold, with the consent they gave to start at once, knowing their right
 * to withdraw (the API refuses an order without it). Checkout then
 * requires it. A legacy plan or a year is not sold (`PlanNotSold`), and
 * no trial is offered (`TrialUnavailable`, `notOffered`). Ordering while
 * the workspace is in a trial or on a legacy plan leaves that running: it
 * ends once the new subscription is recorded (`RecordSubscription`), so a
 * checkout left unfinished loses nothing. An order never puts the
 * workspace above its plan (`PlanTooSmall`, which per-account pricing,
 * holding every account and member, never answers). A workspace whose
 * billing account another workspace bills orders nothing
 * (`BilledElsewhere`). Needs billing:manage and the member in person.
 */
export class PlaceOrder extends Context.Service<
  PlaceOrder,
  {
    readonly place: (
      actor: Actor,
      request: OrderRequest
    ) => Effect.Effect<
      Order,
      | BilledElsewhere
      | BillingOff
      | DatabaseError
      | MissingPermission
      | PersonRequired
      | PlanNotSold
      | PlanTooSmall
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
      const usage = yield* WorkspaceUsage;
      const accounts = yield* BillingAccounts;

      const context = yield* Effect.context<Ids>();

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

        // Every workspace of an account shares its billing workspace's
        // plan, which is ordered there.
        const { holder } = yield* accounts.of(workspaceId);

        if (holder !== workspaceId) {
          return yield* new BilledElsewhere({ billingWorkspaceId: holder });
        }

        // The rate card's free accounts replace the trial.
        if (request.trial) {
          return yield* new TrialUnavailable({ reason: "notOffered" });
        }

        if (request.plan !== "payAsYouGo" || request.interval !== "month") {
          return yield* new PlanNotSold({
            interval: request.interval,
            plan: request.plan,
          });
        }

        // Never above the plan ordered, for what decides whether a
        // workspace must reduce: media over it only refuses uploads.
        const held = yield* usage.of(workspaceId);

        const over = excessesOf(
          allowancesOf(request.plan, {
            accounts: held.channels,
            freeTier: true,
          }),
          held
        );

        if (mustReduce(over)) {
          return yield* new PlanTooSmall({
            over,
            plan: request.plan,
            planWithRoom: planHolding(held),
          });
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
