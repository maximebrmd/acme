import { Effect, Layer, Option } from "effect";

import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { StorageAllowance } from "#media/application/ports/storage-allowance.ts";

/**
 * Each workspace's media storage allowance, as its billing account's plan
 * gives it: per-account pricing's grows with the accounts connected across
 * the account, which the channels context counts, and only it reads them.
 * The pool is billing's (`PlanPools`), held in a transaction.
 */
export const PlanStorageAllowanceLive = Layer.effect(
  StorageAllowance,
  Effect.gen(function* PlanStorageAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const pools = yield* PlanPools;
    const channels = yield* ChannelUsage;

    return StorageAllowance.of({
      bytes: (workspaceId) =>
        entitlements.of(workspaceId).pipe(
          Effect.flatMap((plan) =>
            Option.contains(plan.plan, "payAsYouGo")
              ? channels
                  .connected(workspaceId)
                  .pipe(
                    Effect.map(
                      (accounts) => plan.allowancesFor(accounts).mediaStorage
                    )
                  )
              : Effect.succeed(plan.allowancesFor(0).mediaStorage)
          ),
          Effect.orDie
        ),
      sharedWith: (workspaceId) =>
        pools.sharedWith(workspaceId).pipe(Effect.orDie),
    });
  })
);
