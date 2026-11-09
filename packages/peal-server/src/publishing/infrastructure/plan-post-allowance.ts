import { Effect, Layer } from "effect";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";

/**
 * Each workspace's monthly post allowance and channel allowance, as its
 * plan gives them, with the channels the channels context counts.
 */
export const PlanPostAllowanceLive = Layer.effect(
  PostAllowance,
  Effect.gen(function* PlanPostAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const usage = yield* ChannelUsage;

    return PostAllowance.of({
      channels: (workspaceId) =>
        Effect.all({
          allowed: entitlements
            .of(workspaceId)
            .pipe(Effect.map(({ allowances }) => allowances.channels)),
          connected: usage.connected(workspaceId),
        }),
      scheduledPerMonth: (workspaceId) =>
        entitlements
          .of(workspaceId)
          .pipe(Effect.map(({ allowances }) => allowances.scheduledPosts)),
    });
  })
);
