import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import type { MultipartUploadId } from "#media/domain/media-status.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";

/** A file the bucket holds in the media folder. */
export interface BucketFile {
  readonly byteSize: number;
  readonly key: StorageKey;
  /** When the store last wrote it. */
  readonly modifiedAt: DateTime.Utc;
}

/** A multipart upload the bucket holds open in the media folder. */
export interface BucketUpload {
  readonly key: StorageKey;
  readonly startedAt: DateTime.Utc;
  readonly uploadId: MultipartUploadId;
}

/** Where a listing of multipart uploads stopped: a key, and an upload of it. */
export interface UploadMarker {
  readonly key: string;
  readonly uploadId: Option.Option<string>;
}

/**
 * Which database the media folder belongs to, as its owner marker says:
 * the database's own id, the count of the deleting sweeps' runs it owned
 * (`epoch`, which only they advance), and the Postgres cluster it ran on
 * (`system`, its system identifier, and `timeline`, which every restore
 * changes).
 */
export interface OwnerMarker {
  readonly epoch: number;
  readonly id: string;
  readonly system: string;
  readonly timeline: number;
}

/** The marker as read: none when it does not read as one. */
export interface MarkerRead {
  readonly marker: Option.Option<OwnerMarker>;
  readonly version: Option.Option<string>;
}

/**
 * One page of a listing, in the store's order, and where the next starts,
 * if there is one. It holds only what reads as a key Peal writes
 * (`mediaKeyOf`); what else the page held is passed over, never handed out.
 */
export interface BucketPage<A, M> {
  readonly items: readonly A[];
  readonly next: Option.Option<M>;
}

/**
 * The media folder of the bucket, `media/` under the store's own prefix,
 * listed a page at a time from a position a sweep keeps between runs:
 * nothing outside it is ever listed. Positions are keys relative to the
 * store's prefix.
 */
export class MediaBucket extends Context.Service<
  MediaBucket,
  {
    /** A page of the files, by key, after `after`, or from the first. */
    readonly listFiles: (
      after: Option.Option<string>
    ) => Effect.Effect<BucketPage<BucketFile, string>, MediaStorageFailed>;
    /**
     * A page of the multipart uploads open, by key then upload, after
     * `after`, or from the first.
     */
    readonly listUploads: (
      after: Option.Option<UploadMarker>
    ) => Effect.Effect<
      BucketPage<BucketUpload, UploadMarker>,
      MediaStorageFailed
    >;
    /**
     * The media folder's owner marker (`<prefix>media/.owner`, which no
     * listing hands out), if there is one, with the version the store
     * gave it.
     */
    readonly owner: Effect.Effect<
      Option.Option<MarkerRead>,
      MediaStorageFailed
    >;
    /**
     * Writes the marker only if there is none, and says whether it did:
     * one written meanwhile is never replaced.
     */
    readonly claim: (
      marker: OwnerMarker
    ) => Effect.Effect<boolean, MediaStorageFailed>;
    /**
     * Replaces the marker read as `version`, and says whether the store
     * holds `marker` now: it refuses where the marker changed meanwhile,
     * and a store that ignores the condition is read back. Without a
     * version, for an operator handing the folder over on purpose, it
     * replaces whatever is there.
     */
    readonly replace: (
      marker: OwnerMarker,
      version: Option.Option<string>
    ) => Effect.Effect<boolean, MediaStorageFailed>;
  }
>()("peal-server/media/application/MediaBucket") {}
