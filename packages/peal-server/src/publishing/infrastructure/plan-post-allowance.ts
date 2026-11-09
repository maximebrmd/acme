import { Effect, Layer } from "effect";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";

/** Each workspace's monthly post allowance, as its plan gives it. */
export const PlanPostAllowanceLive = Layer.effect(
  PostAllowance,
  Effect.gen(function* PlanPostAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;

    return PostAllowance.of({
      scheduledPerMonth: (workspaceId) =>
        entitlements
          .of(workspaceId)
          .pipe(Effect.map(({ allowances }) => allowances.scheduledPosts)),
    });
  })
);
