import { Effect, Layer, Option } from "effect";

import { EventOrigins } from "#webhooks/application/ports/event-origins.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/** EventOrigins, as the workspace context says whose each workspace is. */
export const PartnerEventOrigins = Layer.effect(
  EventOrigins,
  Effect.gen(function* PartnerEventOrigins() {
    const ownership = yield* PartnerOwnership;

    return EventOrigins.of({
      isPartnerHome: (workspaceId) => ownership.isHome(workspaceId),
      of: (workspaceId) =>
        ownership.ownerOf(workspaceId).pipe(
          Effect.map(
            Option.map(({ externalId, homeWorkspaceId }) => ({
              externalId,
              homeWorkspaceId,
            }))
          )
        ),
    });
  })
);
