import { Effect, Layer, Option } from "effect";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { StorageAllowance } from "#media/application/ports/storage-allowance.ts";

/**
 * Each workspace's media storage allowance, as its billing account's plan
 * gives it: per-account pricing's grows with the accounts connected across
 * the account, which the channels context counts, and only it reads them.
 * The pool is billing's (`PlanPools`), held in a transaction, on a server
 * that bills only.
 */
export const PlanStorageAllowanceLive = Layer.effect(
  StorageAllowance,
  Effect.gen(function* PlanStorageAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const pools = yield* PlanPools;
    const channels = yield* ChannelUsage;
    const { enabled } = yield* BillingMode;

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
      // A server that does not bill limits nothing: it reads no pool and
      // takes no partner's hold for an upload.
      sharedWith: (workspaceId) =>
        enabled
          ? pools.sharedWith(workspaceId).pipe(Effect.orDie)
          : Effect.succeed([]),
    });
  })
);
