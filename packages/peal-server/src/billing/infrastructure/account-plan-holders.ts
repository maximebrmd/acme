import { Effect, Layer } from "effect";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/**
 * PlanHolders by billing account: a workspace a partner owns is on its
 * home workspace's plan, as the workspace context says (the partner rule
 * first); any other on the plan of its billing account's billing
 * workspace. What the server runs.
 */
export const AccountPlanHoldersLive = Layer.effect(
  PlanHolders,
  Effect.gen(function* AccountPlanHoldersLive() {
    const ownership = yield* PartnerOwnership;
    const accounts = yield* BillingAccounts;

    return PlanHolders.of({
      holderOf: (workspaceId) =>
        accounts.of(workspaceId).pipe(Effect.map(({ holder }) => holder)),
      holdersOf: (workspaceIds) =>
        Effect.gen(function* holdersOf() {
          if (workspaceIds.length === 0) {
            return new Map();
          }

          const partners = yield* ownership.partnersIn(workspaceIds);

          const others = workspaceIds.filter((id) => !partners.has(id));

          const held = yield* accounts.accountsIn(others);

          return new Map(
            workspaceIds.map((workspaceId) => [
              workspaceId,
              partners.get(workspaceId)?.home ??
                held.get(workspaceId)?.holder ??
                workspaceId,
            ])
          );
        }),
    });
  })
);
