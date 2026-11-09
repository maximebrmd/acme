import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { BillingInterval } from "#billing/domain/billing-interval.ts";
import type { Order, OrderId } from "#billing/domain/order.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

/** What a checkout says it is for, to find its order. */
export interface OrderClaim {
  readonly id: OrderId;
  readonly interval: BillingInterval;
  readonly plan: PaidPlan;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
}

/** The orders members placed on the billing page, which checkout takes. */
export class Orders extends Context.Service<
  Orders,
  {
    readonly place: (order: Order) => Effect.Effect<void, DatabaseError>;
    /**
     * Marks the order used and answers it, when it is the claim's (same
     * member, workspace, plan and interval), unused, and placed after
     * `since`; none otherwise. Two checkouts never take the same order.
     */
    readonly take: (
      claim: OrderClaim,
      since: DateTime.Utc,
      now: DateTime.Utc
    ) => Effect.Effect<Option.Option<Order>, DatabaseError>;
  }
>()("peal-server/billing/application/Orders") {}
