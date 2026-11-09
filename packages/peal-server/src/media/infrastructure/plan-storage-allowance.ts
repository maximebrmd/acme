import { Effect, Layer } from "effect";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { StorageAllowance } from "#media/application/ports/storage-allowance.ts";

/** Each workspace's media storage allowance, as its plan gives it. */
export const PlanStorageAllowanceLive = Layer.effect(
  StorageAllowance,
  Effect.gen(function* PlanStorageAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;

    return StorageAllowance.of({
      bytes: (workspaceId) =>
        entitlements.of(workspaceId).pipe(
          Effect.map(({ allowances }) => allowances.mediaStorage),
          Effect.orDie
        ),
    });
  })
);
