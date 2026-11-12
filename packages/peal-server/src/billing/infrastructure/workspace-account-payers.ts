import { Effect, Layer, Option } from "effect";

import { AccountPayers } from "#billing/application/ports/account-payers.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";
import { WorkspaceOwners } from "#workspace/application/workspace-owners.ts";

/**
 * AccountPayers, as the workspace context says whose each workspace is: a
 * partner's (its home, or one it owns), and who owns it.
 */
export const WorkspaceAccountPayersLive = Layer.effect(
  AccountPayers,
  Effect.gen(function* WorkspaceAccountPayersLive() {
    const ownership = yield* PartnerOwnership;
    const owners = yield* WorkspaceOwners;

    return AccountPayers.of({
      firstOwnedBy: (userId) => owners.firstOwnedBy(userId),
      madeIn: (workspaceIds) => owners.madeIn(workspaceIds),
      namesShownTo: (userId, workspaceIds) =>
        owners.namesShownTo(userId, workspaceIds),
      ownersOf: (workspaceId) => owners.ownersOf(workspaceId),
      partnerOf: (workspaceId) =>
        ownership
          .partnersIn([workspaceId])
          .pipe(
            Effect.map((found) =>
              Option.fromUndefinedOr(found.get(workspaceId))
            )
          ),
      partnersIn: (workspaceIds) => ownership.partnersIn(workspaceIds),
    });
  })
);
