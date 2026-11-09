import { Effect, Layer, Option } from "effect";

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
    const publicUrl = yield* publicUrlConfig;

    return UpgradePaths.of({
      from: (workspaceId, limit, needed) =>
        entitlements.of(workspaceId).pipe(
          Effect.orDie,
          Effect.map(({ plan }) => ({
            billingUrl: billingUrlOf(publicUrl, workspaceId),
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
          Effect.map(({ plan }) => ({
            billingUrl: billingUrlOf(publicUrl, workspaceId),
            plan,
            planWithRoom: plan.pipe(Option.map(planToPay)),
          })),
          Effect.withSpan("UpgradePaths.paid")
        ),
    });
  })
);
