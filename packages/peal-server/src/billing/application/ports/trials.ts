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

/**
 * How long a trial's checkout holds the trial for its account and its
 * workspace: past it, a checkout that never completed frees the trial
 * again. Trial checkouts expire before (`trialCheckoutMinutes`).
 */
export const trialReservationMinutes = 60;

/**
 * The trials started, or held by a checkout under way: one per workspace,
 * and one per account.
 */
export class Trials extends Context.Service<
  Trials,
  {
    /**
     * Whether the account or the workspace started a trial, or holds one
     * for a checkout begun since `since`, other than one of this account
     * for this workspace, which a new checkout replaces.
     */
    readonly used: (
      userId: UserId,
      workspaceId: WorkspaceId,
      since: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Holds the trial for a checkout the account starts for the workspace
     * at `now`, at once, so that checkouts of another account or another
     * workspace started meanwhile cannot have it; one of the same account
     * and workspace replaces the earlier hold. False when either already
     * has one, started, or held since `since` for another checkout.
     */
    readonly reserve: (
      userId: UserId,
      workspaceId: WorkspaceId,
      now: DateTime.Utc,
      since: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Whether an account that closed with this email address's pseudonym
     * started a trial: the same address gets no second one.
     */
    readonly usedByPseudonym: (
      pseudonym: string
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Deletes the pseudonyms of accounts closed before `before`
     * (`trialMemory`), and the trials then left naming nobody; says how
     * many.
     */
    readonly forgetPseudonyms: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Records a trial Stripe reported, on the account and workspace's
     * hold, once: one reported again changes nothing. False when the
     * account or the workspace had another trial, which this one then
     * duplicates.
     */
    readonly record: (
      trial: StartedTrial
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/billing/application/Trials") {}
