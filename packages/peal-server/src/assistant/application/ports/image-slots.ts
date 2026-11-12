import { Context } from "effect";
import type { Effect, Scope } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

/** Whose images a slot is for: the server's model's, or a workspace's own provider's. */
export type ImageSource = "server" | "workspace";

/**
 * The images being made: each waits up to a minute and a half for the
 * provider and holds an image in memory, so a workspace makes so many at
 * once, and the server so many in all (`imagesAtOnce`), for each source
 * apart.
 */
export class ImageSlots extends Context.Service<
  ImageSlots,
  {
    /**
     * Takes a slot for the workspace, kept for the scope: false when the
     * workspace, or the server, already makes as many images as it may.
     */
    readonly take: (
      workspaceId: WorkspaceId,
      source: ImageSource
    ) => Effect.Effect<boolean, never, Scope.Scope>;
  }
>()("peal-server/assistant/application/ImageSlots") {}
