import { Effect, Layer, Option } from "effect";

import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { planToPay, planWithRoom } from "#billing/domain/plans.ts";
import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

/** A workspace's billing page in the web app, under PUBLIC_URL. */
export const billingUrlOf = (
  publicUrl: string,
  workspaceId: WorkspaceId
): string => `${publicUrl}/app/${workspaceId}/billing`;

/**
 * Upgrade paths from each workspace's plan, as billing holds it, and the
 * web app's billing page under PUBLIC_URL, read when the server starts.
 */
export const PlanUpgradePathsLive = Layer.effect(
  UpgradePaths,
  Effect.gen(function* PlanUpgradePathsLive() {
    const entitlements = yield* WorkspaceEntitlements;
    const holders = yield* PlanHolders;
    const publicUrl = yield* publicUrlConfig;

    // The billing page where the plan is ordered: that of the workspace
    // that bills its account, on a server that bills.
    const billingPageOf = (
      workspaceId: WorkspaceId,
      plan: Option.Option<unknown>
    ) =>
      (Option.isSome(plan)
        ? holders.holderOf(workspaceId)
        : Effect.succeed(workspaceId)
      ).pipe(
        Effect.orDie,
        Effect.map((holder) => billingUrlOf(publicUrl, holder))
      );

    return UpgradePaths.of({
      from: (workspaceId, limit, needed) =>
        entitlements.of(workspaceId).pipe(
          Effect.orDie,
          Effect.flatMap(({ plan }) =>
            billingPageOf(workspaceId, plan).pipe(
              Effect.map((billingUrl) => ({ billingUrl, plan }))
            )
          ),
          Effect.map(({ billingUrl, plan }) => ({
            billingUrl,
            plan,
            planWithRoom: plan.pipe(
              Option.flatMap((current) => planWithRoom(current, limit, needed))
            ),
          })),
          Effect.withSpan("UpgradePaths.from")
        ),
      paid: (workspaceId) =>
        entitlements.of(workspaceId).pipe(
          Effect.orDie,
          Effect.flatMap(({ plan }) =>
            billingPageOf(workspaceId, plan).pipe(
              Effect.map((billingUrl) => ({ billingUrl, plan }))
            )
          ),
          Effect.map(({ billingUrl, plan }) => ({
            billingUrl,
            plan,
            planWithRoom: plan.pipe(Option.map(planToPay)),
          })),
          Effect.withSpan("UpgradePaths.paid")
        ),
    });
  })
);
