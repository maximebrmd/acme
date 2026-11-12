import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What recording a change did: `recorded`, `duplicate` for an event
 * recorded before, `stale` for an event older than the one the
 * subscription holds, which changes nothing.
 */
export type RecordOutcome = "duplicate" | "recorded" | "stale";

/** The workspaces' Stripe subscriptions, as their webhook events left them. */
export class Subscriptions extends Context.Service<
  Subscriptions,
  {
    /** Every subscription the workspace has had. */
    readonly ofWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly Subscription[], DatabaseError>;
    /**
     * Every subscription each of these workspaces has had, in one read;
     * one that never had any is left out.
     */
    readonly ofWorkspaces: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, readonly Subscription[]>,
      DatabaseError
    >;
    /**
     * The subscriptions that may be due a reminder at `now`: trials ending
     * within days, plans renewing within weeks (`reminderOf` decides).
     */
    readonly remindable: (
      now: DateTime.Utc
    ) => Effect.Effect<readonly Subscription[], DatabaseError>;
    /**
     * Deletes billing's records of the workspace, in the caller's
     * transaction: its subscriptions, and the orders no contract followed.
     * The orders and withdrawals of its contracts stay without it, by
     * their Stripe customer and subscription, for `contractRetention`; its
     * trial stays, without the workspace, if an account started it. The
     * events recorded stay: ids alone.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Leaves billing's records without the user, in the caller's
     * transaction: the orders and withdrawals they made, and the trial they
     * started, which stays the workspace's, and keeps `pseudonym`, their
     * email address's, instead (`trialMemory`).
     */
    readonly forgetUser: (
      userId: UserId,
      pseudonym: string
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Saves what an event says of a subscription, once per event, and only
     * when no later event was saved for it: events come in any order.
     * Events delivered together take turns.
     */
    readonly record: (
      change: SubscriptionChange
    ) => Effect.Effect<RecordOutcome, DatabaseError>;
  }
>()("peal-server/billing/application/Subscriptions") {}
