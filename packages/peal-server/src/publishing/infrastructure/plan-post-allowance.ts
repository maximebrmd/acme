import { DateTime, Effect, Layer, Option } from "effect";

import {
  BillingMode,
  inGrace,
} from "#billing/application/ports/billing-mode.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

/**
 * Each workspace's monthly post allowance, channel allowance and member
 * allowance, as its plan gives them, with the channels the channels
 * context counts and the members the workspace context counts. While the
 * billing grace runs (PEAL_BILLING_GRACE_UNTIL), a workspace on the free
 * tier schedules and publishes whatever accounts it holds: connecting one
 * more is still refused (`ChannelAllowance`).
 */
export const PlanPostAllowanceLive = Layer.effect(
  PostAllowance,
  Effect.gen(function* PlanPostAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const usage = yield* ChannelUsage;
    const seats = yield* WorkspaceSeats;
    const { graceUntil } = yield* BillingMode;

    const scheduling = (
      plan: Effect.Success<ReturnType<typeof entitlements.of>>
    ) =>
      Option.contains(plan.plan, "free")
        ? DateTime.now.pipe(
            Effect.map((now) =>
              inGrace(graceUntil, now)
                ? Option.none()
                : plan.allowanceOf("channels")
            )
          )
        : Effect.succeed(plan.allowanceOf("channels"));

    return PostAllowance.of({
      channels: (workspaceId) =>
        Effect.all({
          allowed: entitlements
            .of(workspaceId)
            .pipe(Effect.flatMap(scheduling)),
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
