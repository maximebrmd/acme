import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

/** A trial Stripe reported started. */
export interface StartedTrial {
  readonly plan: PaidPlan;
  readonly startedAt: DateTime.Utc;
  readonly stripeSubscriptionId: string;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
}

/** The trials started: one per workspace, and one per account. */
export class Trials extends Context.Service<
  Trials,
  {
    /** Whether the account or the workspace started a trial before. */
    readonly used: (
      userId: UserId,
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Records a trial once: one reported again, or a second one of the
     * account or the workspace, changes nothing.
     */
    readonly record: (
      trial: StartedTrial
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/Trials") {}
