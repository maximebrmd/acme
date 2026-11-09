import { Context, Effect, Layer, Option } from "effect";

import { entitlementsOf } from "#billing/domain/entitlements.ts";
import { stillBills } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { BillingRecord } from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { WorkspaceStillBilled } from "./workspace-still-billed.ts";

/**
 * What billing keeps of a workspace as a whole, for the workspace context
 * when a workspace's data is exported or erased: its plan and the state of
 * its subscriptions, never a card, an invoice or Stripe's ids, which stay
 * with Stripe. Erasing runs in the caller's transaction, if any, and is
 * refused, before anything is deleted, while Stripe may still bill the
 * workspace (`stillBills`), as `BilledWorkspaces` refuses Better Auth's
 * deletion. On a server that does not bill, a workspace has no plan, and
 * erasing it is never refused.
 */
export class BillingRecords extends Context.Service<
  BillingRecords,
  {
    /** The workspace's plan and every subscription it has had. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<BillingRecord, DatabaseError>;
    /** Deletes the workspace's subscriptions, once none may bill it. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError | WorkspaceStillBilled>;
  }
>()("acme-server/billing/application/BillingRecords") {
  static readonly layer = Layer.effect(
    BillingRecords,
    Effect.gen(function* BillingRecordsLive() {
      const { enabled } = yield* BillingMode;
      const subscriptions = yield* Subscriptions;

      const exportWorkspace = Effect.fn("BillingRecords.exportWorkspace")(
        function* exportWorkspace(workspaceId: WorkspaceId) {
          const held = yield* subscriptions.ofWorkspace(workspaceId);

          const record: BillingRecord = {
            plan: enabled ? Option.getOrNull(entitlementsOf(held).plan) : null,
            subscriptions: held.map((subscription) => ({
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              currentPeriodEnd: Option.getOrNull(subscription.currentPeriodEnd),
              plan: subscription.plan,
              status: subscription.status,
            })),
          };

          return record;
        }
      );

      const eraseWorkspace = Effect.fn("BillingRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId: WorkspaceId) {
          const held = yield* subscriptions.ofWorkspace(workspaceId);

          // As BilledWorkspaces decides: a server that does not bill never
          // refuses.
          if (
            enabled &&
            held.some((subscription) => stillBills(subscription))
          ) {
            yield* new WorkspaceStillBilled({ workspaceId });
          }

          yield* subscriptions.eraseWorkspace(workspaceId);
        }
      );

      return BillingRecords.of({ eraseWorkspace, exportWorkspace });
    })
  );
}
