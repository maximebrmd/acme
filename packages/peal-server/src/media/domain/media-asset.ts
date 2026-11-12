import { Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { AltTextSchema } from "./alt-text.ts";
import type { AltText } from "./alt-text.ts";
import { InvalidMediaTransition } from "./invalid-media-transition.ts";
import type { MediaAction } from "./invalid-media-transition.ts";
import { MediaAssetIdSchema } from "./media-asset-id.ts";
import type { MediaAssetId } from "./media-asset-id.ts";
import {
  ByteSizeSchema,
  kindOf,
  maxByteSize,
  MediaContentTypeSchema,
  normalizeContentType,
  parseContentType,
} from "./media-format.ts";
import type { ByteSize, MediaContentType, MediaKind } from "./media-format.ts";
import { MediaMetadata } from "./media-metadata.ts";
import { MediaStatusSchema } from "./media-status.ts";
import type {
  MediaStatus,
  ProbeState,
  RejectionReason,
  UploadMethod,
} from "./media-status.ts";
import { MediaTooLarge } from "./media-too-large.ts";
import { StorageKeySchema, storageKeyFor } from "./storage-key.ts";
import { UnsupportedMediaType } from "./unsupported-media-type.ts";

/**
 * An image or video a workspace uploaded, and where it is in its life (see
 * `MediaStatusSchema`). The client declares the content type and size before
 * uploading, and both are checked against the stored file before the asset
 * counts as uploaded. Its description, for people who cannot see it, can be
 * written at any time.
 *
 * Transitions are pure: each takes the asset and the facts it needs, and
 * returns the next asset or a typed error. Time comes in as `now`.
 */
export class MediaAsset extends Schema.Class<MediaAsset>(
  "peal-server/media/domain/MediaAsset"
)({
  /**
   * Whether the writing assistant made the file: shown in the library, and
   * offered to the platforms' own AI labels. Set when the asset is created,
   * never changed.
   */
  aiGenerated: Schema.Boolean,
  altText: Schema.Option(AltTextSchema),
  byteSize: ByteSizeSchema,
  contentType: MediaContentTypeSchema,
  createdAt: Schema.DateTimeUtc,
  id: MediaAssetIdSchema,
  metadata: MediaMetadata,
  status: MediaStatusSchema,
  storageKey: StorageKeySchema,
  updatedAt: Schema.DateTimeUtc,
  workspaceId: WorkspaceIdSchema,
}) {
  get kind(): MediaKind {
    return kindOf(this.contentType);
  }
}

/** A declared file that peal accepts. */
export interface AcceptedUpload {
  readonly byteSize: ByteSize;
  readonly contentType: MediaContentType;
  readonly kind: MediaKind;
}

/**
 * Checks what a client declares before it uploads: a content type peal
 * accepts, and a size within the limit for its kind.
 */
export const acceptUpload = (
  contentType: string,
  byteSize: ByteSize
): Result.Result<AcceptedUpload, MediaTooLarge | UnsupportedMediaType> => {
  const accepted = parseContentType(contentType);

  if (Option.isNone(accepted)) {
    return Result.fail(new UnsupportedMediaType({ contentType }));
  }

  const kind = kindOf(accepted.value);
  const limit = maxByteSize[kind];

  if (byteSize > limit) {
    return Result.fail(
      new MediaTooLarge({ byteSize, kind, maxByteSize: limit })
    );
  }

  return Result.succeed({ byteSize, contentType: accepted.value, kind });
};

/** What a new pending asset is made of. */
export interface NewUpload {
  readonly accepted: AcceptedUpload;
  /** True only for a file the writing assistant made; false by default. */
  readonly aiGenerated?: boolean;
  readonly altText: Option.Option<AltText>;
  readonly id: MediaAssetId;
  readonly upload: UploadMethod;
  readonly workspaceId: WorkspaceId;
}

/** Records an accepted file that the client is about to upload. */
export const startUpload = (
  {
    accepted,
    aiGenerated = false,
    altText,
    id,
    upload,
    workspaceId,
  }: NewUpload,
  now: DateTime.Utc
): MediaAsset =>
  new MediaAsset({
    aiGenerated,
    altText,
    byteSize: accepted.byteSize,
    contentType: accepted.contentType,
    createdAt: now,
    id,
    metadata: MediaMetadata.unknown,
    status: { _tag: "pending", upload },
    storageKey: storageKeyFor(workspaceId, id, accepted.contentType),
    updatedAt: now,
    workspaceId,
  });

/** What the store reports about a stored file. */
export interface StoredObject {
  readonly byteSize: number;
  readonly contentType: Option.Option<string>;
}

/**
 * Why the stored file is not the one the client declared, if it is not: its
 * size or its content type differs.
 */
export const mismatchOf = (
  asset: MediaAsset,
  stored: StoredObject
): Option.Option<RejectionReason> => {
  if (stored.byteSize !== asset.byteSize) {
    return Option.some("sizeMismatch");
  }

  const sameType = stored.contentType.pipe(
    Option.map(normalizeContentType),
    Option.exists((contentType) => contentType === asset.contentType)
  );

  return sameType ? Option.none() : Option.some("typeMismatch");
};

type Transition = Result.Result<MediaAsset, InvalidMediaTransition>;

const withChange = (
  asset: MediaAsset,
  status: MediaStatus,
  metadata: MediaMetadata,
  now: DateTime.Utc
): MediaAsset =>
  new MediaAsset({
    aiGenerated: asset.aiGenerated,
    altText: asset.altText,
    byteSize: asset.byteSize,
    contentType: asset.contentType,
    createdAt: asset.createdAt,
    id: asset.id,
    metadata,
    status,
    storageKey: asset.storageKey,
    updatedAt: now,
    workspaceId: asset.workspaceId,
  });

const refused = (
  asset: MediaAsset,
  action: MediaAction
): Result.Result<never, InvalidMediaTransition> =>
  Result.fail(
    new InvalidMediaTransition({
      action,
      assetId: asset.id,
      from: asset.status._tag,
    })
  );

/** The file arrived with the declared size and content type. */
export const markUploaded = (
  asset: MediaAsset,
  now: DateTime.Utc
): Transition =>
  asset.status._tag === "pending"
    ? Result.succeed(
        withChange(
          asset,
          { _tag: "uploaded", probe: "pending" },
          asset.metadata,
          now
        )
      )
    : refused(asset, "markUploaded");

/**
 * The uploaded file could not be probed, for this reason: it stays uploaded
 * until a probe reads it.
 */
export const markUnprobed = (
  asset: MediaAsset,
  probe: Exclude<ProbeState, "pending">,
  now: DateTime.Utc
): Transition =>
  asset.status._tag === "uploaded"
    ? Result.succeed(
        withChange(asset, { _tag: "uploaded", probe }, asset.metadata, now)
      )
    : refused(asset, "markUnprobed");

/** The uploaded file was probed: it can go into posts. */
export const markReady = (
  asset: MediaAsset,
  metadata: MediaMetadata,
  now: DateTime.Utc
): Transition =>
  asset.status._tag === "uploaded"
    ? Result.succeed(withChange(asset, { _tag: "ready" }, metadata, now))
    : refused(asset, "markReady");

/** The stored file is not what was declared, and is deleted. */
export const markRejected = (
  asset: MediaAsset,
  reason: RejectionReason,
  now: DateTime.Utc
): Transition => {
  const { status } = asset;

  if (status._tag !== "pending" && status._tag !== "uploaded") {
    return refused(asset, "markRejected");
  }

  return Result.succeed(
    withChange(asset, { _tag: "rejected", reason }, asset.metadata, now)
  );
};

/** The asset with this description, or none, whatever its status. */
export const describe = (
  asset: MediaAsset,
  altText: Option.Option<AltText>,
  now: DateTime.Utc
): MediaAsset =>
  new MediaAsset({
    aiGenerated: asset.aiGenerated,
    altText,
    byteSize: asset.byteSize,
    contentType: asset.contentType,
    createdAt: asset.createdAt,
    id: asset.id,
    metadata: asset.metadata,
    status: asset.status,
    storageKey: asset.storageKey,
    updatedAt: now,
    workspaceId: asset.workspaceId,
  });
