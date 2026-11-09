import { Effect, Layer } from "effect";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelAllowance } from "#channels/application/channel-allowance.ts";

/** Each workspace's channel allowance, as its plan gives it. */
export const PlanChannelAllowanceLive = Layer.effect(
  ChannelAllowance,
  Effect.gen(function* PlanChannelAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;

    return ChannelAllowance.of({
      channels: (workspaceId) =>
        entitlements
          .of(workspaceId)
          .pipe(Effect.map(({ allowances }) => allowances.channels)),
    });
  })
);
