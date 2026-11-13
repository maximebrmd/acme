import { Effect, Layer } from "effect";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/**
 * PlanHolders by billing account: a workspace a partner owns is on its
 * home workspace's plan, as the workspace context says (the partner rule
 * first); any other on the plan of its billing account's billing
 * workspace, on a server that bills. What the server runs.
 */
export const AccountPlanHoldersLive = Layer.effect(
  PlanHolders,
  Effect.gen(function* AccountPlanHoldersLive() {
    const ownership = yield* PartnerOwnership;
    const accounts = yield* BillingAccounts;
    const { enabled } = yield* BillingMode;

    return PlanHolders.of({
      // A server that does not bill reads no billing account: only a
      // partner's pool shares a plan there.
      holderOf: (workspaceId) =>
        enabled
          ? accounts.of(workspaceId).pipe(Effect.map(({ holder }) => holder))
          : ownership
              .partnersIn([workspaceId])
              .pipe(
                Effect.map(
                  (found) => found.get(workspaceId)?.home ?? workspaceId
                )
              ),
      holdersOf: (workspaceIds) =>
        Effect.gen(function* holdersOf() {
          if (workspaceIds.length === 0) {
            return new Map();
          }

          const partners = yield* ownership.partnersIn(workspaceIds);

          const others = workspaceIds.filter((id) => !partners.has(id));

          const held = enabled
            ? yield* accounts.accountsIn(others)
            : new Map<WorkspaceId, { readonly holder: WorkspaceId }>();

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
