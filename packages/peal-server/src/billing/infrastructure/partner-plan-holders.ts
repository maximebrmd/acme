import { Effect, Layer, Option } from "effect";

import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/** PlanHolders, as the workspace context says whose each workspace is. */
export const PartnerPlanHoldersLive = Layer.effect(
  PlanHolders,
  Effect.gen(function* PartnerPlanHoldersLive() {
    const ownership = yield* PartnerOwnership;

    return PlanHolders.ofHolders({
      holderOf: (workspaceId) =>
        ownership.ownerOf(workspaceId).pipe(
          Effect.map(
            Option.match({
              onNone: () => workspaceId,
              onSome: ({ homeWorkspaceId }) => homeWorkspaceId,
            })
          )
        ),
      holdersOf: (workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Map())
          : ownership
              .ownersIn(workspaceIds)
              .pipe(
                Effect.map(
                  (owners) =>
                    new Map(
                      workspaceIds.map((workspaceId) => [
                        workspaceId,
                        owners.get(workspaceId)?.homeWorkspaceId ?? workspaceId,
                      ])
                    )
                )
              ),
    });
  })
);
