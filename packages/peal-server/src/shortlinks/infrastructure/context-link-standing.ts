import { Effect, Layer } from "effect";

import { LiveTargetParts } from "#publishing/application/live-target-parts.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { LinkStanding } from "#shortlinks/application/link-standing.ts";
import { WorkspaceStanding } from "#workspace/application/workspace-standing.ts";

/**
 * LinkStanding through publishing's LiveTargetParts and the workspace
 * context's WorkspaceStanding.
 */
export const ContextLinkStanding = Layer.effect(
  LinkStanding,
  Effect.gen(function* ContextLinkStanding() {
    const parts = yield* LiveTargetParts;
    const workspaces = yield* WorkspaceStanding;

    return LinkStanding.of({
      isLive: (targetId, part) => parts.isLive(targetId, part),
      isWorkspaceActive: (workspaceId) =>
        workspaces
          .isActive(workspaceId)
          .pipe(Effect.mapError(({ cause }) => new DatabaseError({ cause }))),
    });
  })
);
