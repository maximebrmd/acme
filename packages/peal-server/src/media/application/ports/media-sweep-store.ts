import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { UploadMethod } from "#media/domain/media-status.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** An asset whose upload started long ago and never completed. */
export interface ExpiredUpload {
  readonly assetId: MediaAssetId;
  readonly createdAt: DateTime.Utc;
  readonly storageKey: StorageKey;
  readonly upload: UploadMethod;
  readonly workspaceId: WorkspaceId;
}

/** Where a read of the expired uploads stopped, oldest first. */
export interface ExpiredPosition {
  readonly assetId: MediaAssetId;
  readonly createdAt: DateTime.Utc;
}

/** This database's own id, for the media folder's owner marker. */
export interface StoreIdentity {
  readonly id: string;
  /** Whether this database has ever claimed the folder. */
  readonly claimed: boolean;
}

/** The sweeps that list the bucket over several runs. */
export type ListingSweep = "orphans" | "uploads";

/** Where a sweep's listing of the bucket stopped. */
export interface SweepCursor {
  readonly key: string;
  /** For a listing of multipart uploads, the last upload of `key`. */
  readonly uploadId: Option.Option<string>;
}

/**
 * What the sweeps of the media store read and change in the database:
 * the uploads never completed, which keys an asset holds, where each
 * listing of the bucket stopped, and the folders of erased workspaces the
 * store may still hold.
 */
export class MediaSweepStore extends Context.Service<
  MediaSweepStore,
  {
    /**
     * Up to `limit` assets still pending that started before, oldest
     * first (by start, then id), after `after` if given.
     */
    readonly expiredUploads: (
      before: DateTime.Utc,
      limit: number,
      after: Option.Option<ExpiredPosition>
    ) => Effect.Effect<readonly ExpiredUpload[], DatabaseError>;
    /**
     * Deletes the asset if it is still pending and started before, and
     * says whether it did: a completion that came first keeps it.
     */
    readonly forgetExpired: (
      assetId: MediaAssetId,
      before: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Those of the keys an asset holds whose file the store may keep:
     * pending, uploaded or ready. A rejected asset's file was deleted.
     */
    readonly keptKeys: (
      keys: readonly StorageKey[]
    ) => Effect.Effect<ReadonlySet<StorageKey>, DatabaseError>;
    /** Where the sweep's listing stopped, if it is under way. */
    readonly cursor: (
      sweep: ListingSweep
    ) => Effect.Effect<Option.Option<SweepCursor>, DatabaseError>;
    /** Keeps where the listing stopped, or forgets it once it ended. */
    readonly saveCursor: (
      sweep: ListingSweep,
      cursor: Option.Option<SweepCursor>,
      now: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Up to `limit` workspaces erased before whose folder the store may
     * still hold, the oldest first.
     */
    readonly erasedFolders: (
      before: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly WorkspaceId[], DatabaseError>;
    /** Whether any asset of the workspace is recorded. */
    readonly holdsAssets: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * This database's id, `candidate` if it had none: kept from then on,
     * through restores.
     */
    readonly identity: (
      candidate: string
    ) => Effect.Effect<StoreIdentity, DatabaseError>;
    /** Notes that this database claimed the media folder. */
    readonly markClaimed: Effect.Effect<void, DatabaseError>;
    /** Forgets the folder once the store holds nothing of it. */
    readonly forgetFolder: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/media/application/MediaSweepStore") {}
