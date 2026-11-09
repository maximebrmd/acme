import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { Money } from "#billing/domain/billing-notice.ts";
import type { Order } from "#billing/domain/order.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** An order a member placed, as their export shows it. */
export interface PlacedOrder {
  readonly consentVersion: string;
  readonly createdAt: DateTime.Utc;
  readonly interval: Order["interval"];
  readonly plan: Order["plan"];
  readonly trial: boolean;
  readonly usedAt: Option.Option<DateTime.Utc>;
  /** None once the workspace is erased. */
  readonly workspaceId: Option.Option<WorkspaceId>;
}

/** A withdrawal a member made, as their export shows it. */
export interface MadeWithdrawal {
  readonly refunded: Money;
  readonly requestedAt: DateTime.Utc;
  /** None once the workspace is erased. */
  readonly workspaceId: Option.Option<WorkspaceId>;
}

/**
 * The orders and withdrawals billing keeps as the proof of each contract:
 * with their workspace while it exists, then, once it is erased, by the
 * Stripe customer and subscription that hold its invoices, for
 * `contractRetention`.
 */
export class ContractRecords extends Context.Service<
  ContractRecords,
  {
    /** The orders and withdrawals the user made, oldest first. */
    readonly ofUser: (userId: UserId) => Effect.Effect<
      {
        readonly orders: readonly PlacedOrder[];
        readonly withdrawals: readonly MadeWithdrawal[];
      },
      DatabaseError
    >;
    /**
     * Deletes the records of workspaces erased before `before`; says how
     * many.
     */
    readonly purge: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/billing/application/ContractRecords") {}
