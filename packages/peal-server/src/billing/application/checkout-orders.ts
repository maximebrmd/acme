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
import { planAllowances, trialDays } from "#billing/domain/plans.ts";
import { excessesOf } from "#billing/domain/standing.ts";
import { TrialUnavailable } from "#billing/domain/trial-unavailable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Pseudonyms } from "#shared/application/pseudonyms.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { LegacyPaidPlan } from "#shared/domain/plan.ts";

import { holdsSince, trialOpen } from "./place-order.ts";
import { Orders } from "./ports/orders.ts";
import { PlanHolders } from "./ports/plan-holders.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import { Trials } from "./ports/trials.ts";
import { UsageAtCheckout } from "./ports/usage-at-checkout.ts";

const decodeOrderId = Schema.decodeUnknownOption(OrderIdSchema);

/** What a checkout is about to start. */
export interface CheckoutRequest {
  /** The member's email address, as their session has it. */
  readonly email: string;
  readonly interval: BillingInterval;
  /** As the checkout's metadata names it: no order has another shape. */
  readonly orderId: string;
  readonly plan: LegacyPaidPlan;
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
 * A workspace that has outgrown the plan since the order starts none.
 * An order for the trial starts the checkout with its days, if the
 * workspace and the account still have it, and holds the trial for them
 * until the checkout expires (`Trials.reserve`); an account closed with the
 * same email address that had a trial counts as the same account
 * (`trialMemory`).
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
      const pseudonyms = yield* Pseudonyms;
      const holders = yield* PlanHolders;
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

        // Ordered while the workspace billed its account: handed over or
        // joined to another since, it orders nothing more.
        if (
          (yield* holders.holderOf(request.workspaceId)) !== request.workspaceId
        ) {
          return yield* new OrderRequired();
        }

        // Never above the plan ordered: what the workspace holds is
        // counted again, as it may have grown since the order, in a trial
        // of a larger plan. The order no longer stands; placed again, it
        // says what to remove first.
        const counted = yield* usage.of(request.workspaceId);

        if (
          Option.isNone(counted) ||
          excessesOf(planAllowances[request.plan], counted.value).length > 0
        ) {
          return yield* new OrderRequired();
        }

        if (!order.value.trial) {
          const paid: CheckoutTerms = { trialDays: Option.none() };

          return paid;
        }

        if (!(yield* trialOpen(request.userId, request.workspaceId))) {
          return yield* new TrialUnavailable({ reason: "used" });
        }

        // An account closed with the same address had it.
        const pseudonym = yield* pseudonyms.ofEmail(request.email);

        if (yield* Trials.use((trials) => trials.usedByPseudonym(pseudonym))) {
          return yield* new TrialUnavailable({ reason: "used" });
        }

        // Held at once: a checkout of another workspace or account started
        // meanwhile finds it taken.
        const held = yield* Trials.use((trials) =>
          trials.reserve(
            request.userId,
            request.workspaceId,
            now,
            holdsSince(now)
          )
        );

        if (!held) {
          return yield* new TrialUnavailable({ reason: "used" });
        }

        const trial: CheckoutTerms = { trialDays: Option.some(trialDays) };

        return trial;
      }, Effect.provide(context));

      return CheckoutOrders.of({ take });
    })
  );
}
