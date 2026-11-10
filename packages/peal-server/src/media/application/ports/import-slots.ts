import { Context } from "effect";
import type { Effect, Scope } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The imports under way: each fetches a file for up to a minute and a
 * half, holding a part of it, so a workspace runs so many at once, and the
 * server so many in all (`importsAtOnce`).
 */
export class ImportSlots extends Context.Service<
  ImportSlots,
  {
    /**
     * Takes a slot for the workspace, kept for the scope: false when the
     * workspace, or the server, already runs as many imports as it may.
     */
    readonly take: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, never, Scope.Scope>;
  }
>()("peal-server/media/application/ImportSlots") {}
