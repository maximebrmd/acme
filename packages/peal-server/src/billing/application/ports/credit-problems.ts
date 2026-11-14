import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** Money owed back that Stripe did not give, for staff to settle. */
export interface CreditProblem {
  /** In the currency's smallest unit. */
  readonly amount: number;
  /** Stripe's error code, or the refund's failure reason. */
  readonly code: Option.Option<string>;
  readonly currency: string;
  /** What makes it once: `credit:<subscription>:<reason>`, `refund:<id>`. */
  readonly key: string;
  readonly kind: "creditRefused" | "refundFailed";
  readonly occurredAt: DateTime.Utc;
  readonly reason: Option.Option<string>;
  readonly refundId: Option.Option<string>;
  readonly stripeSubscriptionId: Option.Option<string>;
  readonly workspaceId: Option.Option<WorkspaceId>;
}

/**
 * The credits Stripe refused for good and the refunds it reported failed,
 * kept for staff (`billing.credit_problems`).
 */
export class CreditProblems extends Context.Service<
  CreditProblems,
  {
    /** Keeps it, once by its key; says whether it is new. */
    readonly record: (
      problem: CreditProblem
    ) => Effect.Effect<boolean, DatabaseError>;
    /** The newest first, `limit` at most. */
    readonly latest: (
      limit: number
    ) => Effect.Effect<readonly CreditProblem[], DatabaseError>;
  }
>()("peal-server/billing/application/CreditProblems") {}
