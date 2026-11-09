import { Context, Effect, Layer } from "effect";

import { stillBills } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { Subscriptions } from "./ports/subscriptions.ts";

/**
 * Whether a workspace still has a subscription Stripe may bill, unpaid and
 * paused ones included (`stillBills`), which keeps it from being deleted.
 * Better Auth's Stripe plugin refuses that too, but only after the
 * workspace's other deletion hooks ran. On a server that does not bill,
 * none, without reading anything.
 */
export class BilledWorkspaces extends Context.Service<
  BilledWorkspaces,
  {
    readonly stillBilled: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("acme-server/billing/application/BilledWorkspaces") {
  static readonly layer = Layer.effect(
    BilledWorkspaces,
    Effect.gen(function* BilledWorkspacesLive() {
      const { enabled } = yield* BillingMode;
      const subscriptions = yield* Subscriptions;

      const stillBilled = Effect.fn("BilledWorkspaces.stillBilled")(
        function* stillBilled(workspaceId: WorkspaceId) {
          if (!enabled) {
            return false;
          }

          const held = yield* subscriptions.ofWorkspace(workspaceId);

          return held.some((subscription) => stillBills(subscription));
        }
      );

      return BilledWorkspaces.of({ stillBilled });
    })
  );
}
