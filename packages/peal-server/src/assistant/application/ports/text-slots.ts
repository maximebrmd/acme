import { Context } from "effect";
import type { Effect, Scope } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The requests under way to workspaces' own text providers: so many a
 * workspace, and so many in all (`ownTextAtOnce`), apart from anything the
 * server's own model runs.
 */
export class TextSlots extends Context.Service<
  TextSlots,
  {
    /**
     * Takes a slot for the workspace, kept for the scope: false when the
     * workspace, or the server, already runs as many as it may.
     */
    readonly take: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, never, Scope.Scope>;
  }
>()("peal-server/assistant/application/TextSlots") {}
