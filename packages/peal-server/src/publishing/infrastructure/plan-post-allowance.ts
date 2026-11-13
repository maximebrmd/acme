import { Effect, Layer } from "effect";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

/**
 * Each workspace's monthly post allowance, channel allowance and member
 * allowance, as its plan gives them, with the channels the channels
 * context counts and the members the workspace context counts.
 */
export const PlanPostAllowanceLive = Layer.effect(
  PostAllowance,
  Effect.gen(function* PlanPostAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const usage = yield* ChannelUsage;
    const seats = yield* WorkspaceSeats;

    return PostAllowance.of({
      channels: (workspaceId) =>
        Effect.all({
          allowed: entitlements
            .of(workspaceId)
            .pipe(Effect.map((plan) => plan.allowanceOf("channels"))),
          connected: usage.connected(workspaceId),
        }),
      members: (workspaceId) =>
        Effect.all({
          allowed: entitlements
            .of(workspaceId)
            .pipe(Effect.map((plan) => plan.allowanceOf("members"))),
          taken: seats
            .taken(workspaceId)
            .pipe(Effect.mapError(({ cause }) => new DatabaseError({ cause }))),
        }),
      scheduledPerMonth: (workspaceId) =>
        entitlements
          .of(workspaceId)
          .pipe(Effect.map((plan) => plan.allowanceOf("scheduledPosts"))),
    });
  })
);
