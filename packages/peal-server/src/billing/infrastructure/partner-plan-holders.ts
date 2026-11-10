import { Effect, Layer, Option } from "effect";

import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/** PlanHolders, as the workspace context says whose each workspace is. */
export const PartnerPlanHoldersLive = Layer.effect(
  PlanHolders,
  Effect.gen(function* PartnerPlanHoldersLive() {
    const ownership = yield* PartnerOwnership;

    return PlanHolders.of({
      holderOf: (workspaceId) =>
        ownership.ownerOf(workspaceId).pipe(
          Effect.map(
            Option.match({
              onNone: () => workspaceId,
              onSome: ({ homeWorkspaceId }) => homeWorkspaceId,
            })
          )
        ),
    });
  })
);
