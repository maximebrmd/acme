import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";

/**
 * What the sign-in service's Stripe plugin keeps of a workspace's
 * checkouts, ahead of the subscription events billing records: the status
 * of each subscription a checkout started, which it writes as soon as
 * Stripe sends the member back, and the Checkout Sessions still open at
 * Stripe for the workspace's customer.
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
     * Expires every Checkout Session still open at Stripe for the
     * workspace, so none can complete, and says how many.
     */
    readonly expireOpen: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError | StripeUnreachable>;
  }
>()("acme-server/billing/application/Checkouts") {}
