import { Effect, Layer, Option } from "effect";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/**
 * Each workspace's pool: a partner's, as the workspace context says (the
 * partner rule first, under the partner's hold), else its billing
 * account's other workspaces, under the account's hold, on a server that
 * bills (one that does not reads no account). Both holds are taken here,
 * in the one place. What the server runs.
 */
export const AccountPlanPoolsLive = Layer.effect(
  PlanPools,
  Effect.gen(function* AccountPlanPoolsLive() {
    const ownership = yield* PartnerOwnership;
    const accounts = yield* BillingAccounts;
    const { enabled } = yield* BillingMode;

    return PlanPools.of({
      sharedWith: (workspaceId) =>
        ownership.poolOf(workspaceId).pipe(
          Effect.flatMap(
            Option.match({
              // A server that does not bill counts nothing across an
              // account, and reads, makes or holds none.
              onNone: () =>
                enabled
                  ? accounts
                      .poolOf(workspaceId)
                      .pipe(Effect.map(({ others }) => others))
                  : Effect.succeed([]),
              onSome: ({ others }) => Effect.succeed(others),
            })
          ),
          Effect.withSpan("PlanPools.sharedWith")
        ),
      sharingIn: Effect.fn("PlanPools.sharingIn")(function* sharingIn(
        workspaceIds: readonly WorkspaceId[]
      ) {
        const pools = yield* ownership.poolsIn(workspaceIds);

        const rest = workspaceIds.filter((id) => !pools.has(id));

        const held = enabled
          ? yield* accounts.poolsIn(rest)
          : new Map<WorkspaceId, { readonly others: readonly WorkspaceId[] }>();

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
