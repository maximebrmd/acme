import { Context, DateTime, Duration, Effect, Layer, Option } from "effect";

import type { BillingInterval } from "#billing/domain/billing-interval.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import { consentVersion, Order, OrderIdSchema } from "#billing/domain/order.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { PlanTooSmall } from "#billing/domain/plan-too-small.ts";
import { planAllowances, trialPlan } from "#billing/domain/plans.ts";
import { excessesOf, planHolding } from "#billing/domain/standing.ts";
import { TrialUnavailable } from "#billing/domain/trial-unavailable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { Pseudonyms } from "#shared/application/pseudonyms.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { MemberAddresses } from "./ports/member-addresses.ts";
import { Orders } from "./ports/orders.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { trialReservationMinutes, Trials } from "./ports/trials.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** What a member orders. */
export interface OrderRequest {
  readonly interval: BillingInterval;
  readonly plan: PaidPlan;
  /** The trial of `trialPlan`, monthly, rather than a paid order. */
  readonly trial: boolean;
}

/** The oldest hold of a trial checkout that still holds the trial at `now`. */
export const holdsSince = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtractDuration(now, Duration.minutes(trialReservationMinutes));

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

  const since = holdsSince(yield* DateTime.now);

  return !(yield* Trials.use((trials) =>
    trials.used(userId, workspaceId, since)
  ));
});

/**
 * Whether this member may still start the trial for the workspace
 * (`trialOpen`), and no account closed with their email address had one:
 * a trial is one per address, as checkout checks again with the session's
 * (`CheckoutOrders`). The billing page and an order say so before it.
 */
export const trialOffered = Effect.fn("Billing.trialOffered")(
  function* trialOffered(userId: UserId, workspaceId: WorkspaceId) {
    if (!(yield* trialOpen(userId, workspaceId))) {
      return false;
    }

    const address = yield* MemberAddresses.use((addresses) =>
      addresses.of(userId, workspaceId)
    );

    if (Option.isNone(address)) {
      return true;
    }

    const pseudonym = yield* Pseudonyms.use((pseudonyms) =>
      pseudonyms.ofEmail(address.value)
    );

    return !(yield* Trials.use((trials) => trials.usedByPseudonym(pseudonym)));
  }
);

/**
 * Records what a member orders on the billing page, before Stripe's
 * checkout: the plan and interval, or the trial, with the consent they
 * gave to start at once, knowing their right to withdraw (the API refuses
 * an order without it). Checkout then requires it. Ordering a paid plan
 * while the workspace is in its trial leaves the trial running: it ends
 * once the paid subscription is recorded (`RecordSubscription`), so a
 * checkout left unfinished loses nothing. An order for a plan that does
 * not hold what the workspace has (its channels, members and media) is
 * refused, listing what to remove first (`PlanTooSmall`): moving down
 * never leaves a workspace over its plan. Needs billing:manage and the
 * member in person.
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

      const context = yield* Effect.context<
        Ids | MemberAddresses | Pseudonyms | Subscriptions | Trials
      >();

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

          if (!(yield* trialOffered(userId, workspaceId))) {
            return yield* new TrialUnavailable({ reason: "used" });
          }
        }

        // Never above the plan ordered: moving to a smaller plan waits
        // until the workspace fits it.
        const held = yield* usage.of(workspaceId);
        const over = excessesOf(planAllowances[request.plan], held);

        if (over.length > 0) {
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
