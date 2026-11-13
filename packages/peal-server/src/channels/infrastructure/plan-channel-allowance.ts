import { Effect, Layer, Option } from "effect";

import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelAllowance } from "#channels/application/channel-allowance.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/**
 * Each workspace's channel allowance, as its plan gives it, every
 * workspace holding its channels alone: for servers and tests without
 * partner accounts.
 */
export const PlanChannelAllowanceLive = Layer.effect(
  ChannelAllowance,
  Effect.gen(function* PlanChannelAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;

    return ChannelAllowance.of({
      channels: (workspaceId) =>
        entitlements
          .of(workspaceId)
          .pipe(Effect.map((plan) => plan.allowanceOf("channels"))),
      sharedWith: () => Effect.succeed([]),
      sharingIn: () => Effect.succeed(new Map()),
    });
  })
);

/**
 * Each workspace's channel allowance, as its plan gives it, shared with
 * the workspaces the workspace context says hold the same plan: those a
 * partner owns, and the partner's home workspace. What the server runs.
 */
export const SharedChannelAllowanceLive = Layer.effect(
  ChannelAllowance,
  Effect.gen(function* SharedChannelAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const ownership = yield* PartnerOwnership;

    return ChannelAllowance.of({
      channels: (workspaceId) =>
        entitlements
          .of(workspaceId)
          .pipe(Effect.map((plan) => plan.allowanceOf("channels"))),
      sharedWith: (workspaceId) =>
        ownership.poolOf(workspaceId).pipe(
          Effect.map(
            Option.match({
              onNone: () => [],
              onSome: ({ others }) => others,
            })
          )
        ),
      sharingIn: (workspaceIds) =>
        ownership
          .poolsIn(workspaceIds)
          .pipe(
            Effect.map(
              (pools) =>
                new Map([...pools].map(([id, { others }]) => [id, others]))
            )
          ),
    });
  })
);

/**
 * Each workspace's channel allowance, as its plan gives it, shared with
 * the workspaces of its pool (billing's `PlanPools`: a partner's, else its
 * billing account's, under the pool's hold). What the server runs.
 */
export const AccountChannelAllowanceLive = Layer.effect(
  ChannelAllowance,
  Effect.gen(function* AccountChannelAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const pools = yield* PlanPools;

    return ChannelAllowance.of({
      channels: (workspaceId) =>
        entitlements
          .of(workspaceId)
          .pipe(Effect.map((plan) => plan.allowanceOf("channels"))),
      sharedWith: pools.sharedWith,
      sharingIn: pools.sharingIn,
    });
  })
);
