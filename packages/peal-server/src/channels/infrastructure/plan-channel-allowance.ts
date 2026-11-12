import { Effect, Layer, Option } from "effect";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelAllowance } from "#channels/application/channel-allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
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
          .pipe(Effect.map(({ allowances }) => allowances.channels)),
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
          .pipe(Effect.map(({ allowances }) => allowances.channels)),
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
 * the workspaces of its pool: a partner's, as the workspace context says
 * (the partner rule first, under the partner's hold), else its billing
 * account's other workspaces, under the account's hold. Both holds are
 * taken here, in the one place, so no caller chooses. What the server
 * runs.
 */
export const AccountChannelAllowanceLive = Layer.effect(
  ChannelAllowance,
  Effect.gen(function* AccountChannelAllowanceLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const ownership = yield* PartnerOwnership;
    const accounts = yield* BillingAccounts;

    return ChannelAllowance.of({
      channels: (workspaceId) =>
        entitlements
          .of(workspaceId)
          .pipe(Effect.map(({ allowances }) => allowances.channels)),
      sharedWith: (workspaceId) =>
        ownership.poolOf(workspaceId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () =>
                accounts
                  .poolOf(workspaceId)
                  .pipe(Effect.map(({ others }) => others)),
              onSome: ({ others }) => Effect.succeed(others),
            })
          )
        ),
      sharingIn: (workspaceIds) =>
        Effect.gen(function* sharingIn() {
          const pools = yield* ownership.poolsIn(workspaceIds);

          const rest = workspaceIds.filter((id) => !pools.has(id));

          const held = yield* accounts.poolsIn(rest);

          return new Map<WorkspaceId, readonly WorkspaceId[]>([
            ...[...pools].map(([id, { others }]) => [id, others] as const),
            ...[...held].flatMap(([id, { others }]) =>
              others.length > 0 ? [[id, others] as const] : []
            ),
          ]);
        }),
    });
  })
);
