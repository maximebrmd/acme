import { Context } from "effect";
import type { Effect } from "effect";

import type { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

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
     * Deletes every subscription of the workspace, in the caller's
     * transaction, if any. The events recorded stay: ids alone.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
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
