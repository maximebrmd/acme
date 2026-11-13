import { DateTime, Effect, Layer, Option } from "effect";

import {
  BillingMode,
  inGrace,
} from "#billing/application/ports/billing-mode.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

/**
 * Each workspace's monthly post allowance, channel allowance and member
 * allowance, as its plan gives them, with the channels the channels
 * context counts and the members the workspace context counts. While the
 * billing grace runs (PEAL_BILLING_GRACE_UNTIL), a workspace on the free
 * tier schedules and publishes on the accounts it had connected before the
 * grace started: connecting one more is still refused
 * (`ChannelAllowance`), and one connected since is never graced.
 */
export const PlanPostAllowanceLive = Layer.effect(
  PostAllowance,
  Effect.gen(function* PlanPostAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const usage = yield* ChannelUsage;
    const seats = yield* WorkspaceSeats;
    const { graceSince, graceUntil } = yield* BillingMode;

    // What a workspace may schedule on: its plan's channels, or, while the
    // grace runs on a free tier staff did not take away, those it had
    // connected before the grace started when they are more (never one
    // connected since). Read only for a workspace over its free accounts.
    const scheduling = (
      workspaceId: WorkspaceId,
      plan: Effect.Success<ReturnType<typeof entitlements.of>>,
      connected: number
    ) =>
      Effect.gen(function* schedulingOn() {
        const allowed = plan.allowanceOf("channels");
        const free = Option.getOrElse(allowed, () => 0);

        if (
          !Option.contains(plan.plan, "free") ||
          !plan.freeTier ||
          Option.isNone(graceSince) ||
          connected <= free ||
          !inGrace(graceUntil, yield* DateTime.now)
        ) {
          return allowed;
        }

        const before = yield* usage.connected(workspaceId, graceSince.value);

        return Option.some(Math.max(free, before));
      });

    return PostAllowance.of({
      channels: (workspaceId) =>
        Effect.gen(function* channels() {
          const [plan, connected] = yield* Effect.all([
            entitlements.of(workspaceId),
            usage.connected(workspaceId),
          ]);

          return {
            allowed: yield* scheduling(workspaceId, plan, connected),
            connected,
          };
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
