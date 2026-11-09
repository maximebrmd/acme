import { Context } from "effect";
import type { Effect } from "effect";

import type { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What the sign-in service's Stripe plugin keeps of a workspace's
 * checkouts, ahead of the subscription events billing records: the status
 * of each subscription a checkout started, which it writes as soon as
 * Stripe sends the member back, and the Checkout Sessions still open at
 * Stripe for the workspace's customer, and the subscriptions Stripe holds
 * for it, which deleting the workspace cancels.
 */
export class Checkouts extends Context.Service<
  Checkouts,
  {
    /**
     * The status the plugin holds of each subscription a checkout of the
     * workspace started, in Stripe's words.
     */
    readonly statuses: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly string[], DatabaseError>;
    /**
     * Whether the workspace still exists, holding it, in the caller's
     * transaction, until that ends: a deletion of it running at once is
     * waited for, and once it commits the workspace is gone.
     */
    readonly holdWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Expires every Checkout Session still open at Stripe for the
     * workspace, so none can complete, and says how many.
     */
    readonly expireOpen: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError | StripeUnreachable>;
    /**
     * The status, in Stripe's words, of every subscription Stripe holds
     * for the workspace's customers: a checkout that completed before its
     * events came, and before the member came back, started one that
     * nothing else tells of yet.
     */
    readonly atStripe: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly string[], DatabaseError | StripeUnreachable>;
    /**
     * Cancels at Stripe, at once, every subscription of the workspace that
     * `mayBill` says may still bill it: those Stripe holds for the
     * workspace's customers, those a checkout started that the plugin
     * holds, and those `known` names, which billing's own records hold.
     * Nothing is prorated and no final invoice is made: the period paid
     * for is not refunded, and nothing more is charged. A subscription
     * Stripe says ended, or no longer knows, is left alone. Says how many
     * were cancelled.
     */
    readonly cancelBilled: (
      workspaceId: WorkspaceId,
      subscriptions: {
        readonly known: readonly string[];
        readonly mayBill: (status: string) => boolean;
      }
    ) => Effect.Effect<number, DatabaseError | StripeUnreachable>;
  }
>()("peal-server/billing/application/Checkouts") {}
