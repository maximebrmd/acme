import { Context, Schema } from "effect";
import type { Duration, Effect, Option, Stream } from "effect";

import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import type { MultipartUploadNotFound } from "#media/application/multipart-upload-not-found.ts";
import type { StoredObject } from "#media/domain/media-asset.ts";
import type { ByteSize, MediaContentType } from "#media/domain/media-format.ts";
import type { MultipartUploadId } from "#media/domain/media-status.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import type { PartNumber, PlannedPart } from "#media/domain/upload-plan.ts";

/**
 * A request the client sends straight to the store, signed by peal so it
 * needs no credentials. The store checks the signed headers, so the client
 * sends them exactly as given, and the body must have the planned size.
 * A single upload only creates the file: sent again once the file is
 * stored, it fails with 412, and the client completes the upload.
 */
export const SignedRequestSchema = Schema.Struct({
  headers: Schema.Record(Schema.String, Schema.String),
  method: Schema.Literal("PUT"),
  url: Schema.String,
});

export type SignedRequest = typeof SignedRequestSchema.Type;

/** A file to upload in one request. */
export interface UploadToSign {
  readonly byteSize: ByteSize;
  readonly contentType: MediaContentType;
  readonly expiresIn: Duration.Duration;
  readonly key: StorageKey;
}

/** A multipart upload the store has started. */
export interface MultipartUpload {
  readonly key: StorageKey;
  readonly uploadId: MultipartUploadId;
}

/** One part of a multipart upload, to sign. */
export interface PartToSign {
  readonly expiresIn: Duration.Duration;
  readonly part: PlannedPart;
  readonly upload: MultipartUpload;
}

/** A part the store holds for a multipart upload in progress. */
export interface StoredPart {
  readonly byteSize: number;
  readonly etag: string;
  readonly partNumber: PartNumber;
}

/**
 * The media store: an S3-compatible bucket. Clients upload straight to it
 * with presigned requests, so files never pass through the API, and
 * platforms that fetch media by URL read it from there too.
 */
export class MediaStorage extends Context.Service<
  MediaStorage,
  {
    /** Signs one PUT of the whole file, which fails if the file exists. */
    readonly signUpload: (
      upload: UploadToSign
    ) => Effect.Effect<SignedRequest, MediaStorageFailed>;
    /** Starts a multipart upload, whose parts the client then sends. */
    readonly startMultipartUpload: (
      key: StorageKey,
      contentType: MediaContentType
    ) => Effect.Effect<MultipartUploadId, MediaStorageFailed>;
    /** Signs the PUT of one part. */
    readonly signUploadPart: (
      part: PartToSign
    ) => Effect.Effect<SignedRequest, MediaStorageFailed>;
    /** The parts the store has received, in order. */
    readonly listUploadedParts: (
      upload: MultipartUpload
    ) => Effect.Effect<
      readonly StoredPart[],
      MediaStorageFailed | MultipartUploadNotFound
    >;
    /** Joins the parts into the stored file, which then replaces the upload. */
    readonly completeMultipartUpload: (
      upload: MultipartUpload,
      parts: readonly StoredPart[]
    ) => Effect.Effect<void, MediaStorageFailed | MultipartUploadNotFound>;
    /** Drops a multipart upload and its parts. Succeeds if it is gone. */
    readonly abortMultipartUpload: (
      upload: MultipartUpload
    ) => Effect.Effect<void, MediaStorageFailed>;
    /** The stored file's size and content type, if it exists. */
    readonly head: (
      key: StorageKey
    ) => Effect.Effect<Option.Option<StoredObject>, MediaStorageFailed>;
    /**
     * A URL anyone can GET the file from for at least `expiresIn`, for
     * platforms that fetch media themselves: a public URL when the store
     * serves the bucket publicly, a presigned GET otherwise.
     */
    readonly publicUrl: (
      key: StorageKey,
      expiresIn: Duration.Duration
    ) => Effect.Effect<string, MediaStorageFailed>;
    /**
     * The stored file's bytes, read as they arrive, for platforms that take
     * uploads: nothing is held in memory but the chunk in flight.
     */
    readonly read: (
      key: StorageKey
    ) => Stream.Stream<Uint8Array, MediaStorageFailed>;
    /** Deletes the stored file. Succeeds if it is gone. */
    readonly remove: (
      key: StorageKey
    ) => Effect.Effect<void, MediaStorageFailed>;
  }
>()("peal-server/media/application/MediaStorage") {}
