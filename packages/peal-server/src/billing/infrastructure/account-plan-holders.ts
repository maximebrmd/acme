import { Effect, Layer } from "effect";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import type { HeldPlan } from "#billing/application/ports/plan-holders.ts";
import type { BillingAccount } from "#billing/domain/billing-account.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/**
 * PlanHolders by billing account: a workspace a partner owns is on its
 * home workspace's plan, as the workspace context says (the partner rule
 * first); any other on the plan of its billing account's billing
 * workspace, on a server that bills, with that account's free tier. What
 * the server runs.
 */
export const AccountPlanHoldersLive = Layer.effect(
  PlanHolders,
  Effect.gen(function* AccountPlanHoldersLive() {
    const ownership = yield* PartnerOwnership;
    const accounts = yield* BillingAccounts;
    const { enabled } = yield* BillingMode;

    // A server that does not bill reads no billing account: only a
    // partner's pool shares a plan there, and nothing is free or not.
    const heldBy = (workspaceId: WorkspaceId) =>
      enabled
        ? accounts.of(workspaceId).pipe(
            Effect.map(({ freeTier, holder }): HeldPlan => ({
              freeTier,
              holder,
            }))
          )
        : ownership.partnersIn([workspaceId]).pipe(
            Effect.map((found): HeldPlan => ({
              freeTier: true,
              holder: found.get(workspaceId)?.home ?? workspaceId,
            }))
          );

    const heldByEach = Effect.fn("PlanHolders.heldByEach")(function* heldByEach(
      workspaceIds: readonly WorkspaceId[]
    ) {
      if (workspaceIds.length === 0) {
        return new Map<WorkspaceId, HeldPlan>();
      }

      const partners = yield* ownership.partnersIn(workspaceIds);

      const held = enabled
        ? yield* accounts.accountsIn(workspaceIds)
        : new Map<WorkspaceId, BillingAccount>();

      return new Map(
        workspaceIds.map((workspaceId): [WorkspaceId, HeldPlan] => {
          const account = held.get(workspaceId);

          return [
            workspaceId,
            {
              freeTier: account?.freeTier ?? true,
              holder:
                partners.get(workspaceId)?.home ??
                account?.holder ??
                workspaceId,
            },
          ];
        })
      );
    });

    return PlanHolders.of({
      heldBy,
      heldByEach,
      holderOf: (workspaceId) =>
        heldBy(workspaceId).pipe(Effect.map(({ holder }) => holder)),
      holdersOf: (workspaceIds) =>
        heldByEach(workspaceIds).pipe(
          Effect.map(
            (held) => new Map([...held].map(([id, { holder }]) => [id, holder]))
          )
        ),
    });
  })
);
