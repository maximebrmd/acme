import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ImageProviderRecord,
  OwnImagesRecord,
  OwnTextRecord,
  TextProviderRecord,
  UsageRecord,
} from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's assistant usage as a whole, and the image and text
 * providers it brought, for the workspace context when a workspace's data is exported
 * or erased. Erasing runs in the caller's
 * transaction, if any.
 */
export class UsageRecords extends Context.Service<
  UsageRecords,
  {
    /** The workspace's request counts, by UTC day, oldest first. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly UsageRecord[], DatabaseError>;
    /**
     * The image provider the workspace brought, without its key; null when
     * it has none.
     */
    readonly exportImageProvider: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<ImageProviderRecord | null, DatabaseError>;
    /**
     * How many images the workspace asked its own provider for, by UTC
     * day, oldest first.
     */
    readonly exportOwnImages: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly OwnImagesRecord[], DatabaseError>;
    /**
     * The text provider the workspace brought, without its key; null when
     * it has none.
     */
    readonly exportTextProvider: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<TextProviderRecord | null, DatabaseError>;
    /**
     * How many requests the workspace sent its own text provider, by UTC
     * day, oldest first.
     */
    readonly exportOwnText: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly OwnTextRecord[], DatabaseError>;
    /** Deletes the counts and the providers, their keys with them. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/assistant/application/UsageRecords") {}
