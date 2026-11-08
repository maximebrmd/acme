import { DateTime, Effect, Schema } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import {
  MediaStorage,
  SignedRequestSchema,
} from "#media/application/ports/media-storage.ts";
import { CurrentUploadPolicy } from "#media/application/upload-policy.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import {
  acceptUpload,
  MediaAsset,
  startUpload,
} from "#media/domain/media-asset.ts";
import { ByteSizeSchema } from "#media/domain/media-format.ts";
import type { ByteSize } from "#media/domain/media-format.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import {
  PartNumberSchema,
  PartSizeSchema,
  plannedParts,
  planUpload,
} from "#media/domain/upload-plan.ts";
import { newId } from "#shared/application/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A file the client is about to upload, as it declares it. */
export interface CreateUploadRequest {
  readonly byteSize: ByteSize;
  readonly contentType: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * Where the client sends the file, and until when it can start: one PUT, or
 * one PUT per part, each with its exact size. The URLs only work for the
 * declared size and content type.
 */
export const UploadTargetSchema = Schema.Union([
  Schema.TaggedStruct("single", {
    expiresAt: Schema.DateTimeUtc,
    request: SignedRequestSchema,
  }),
  Schema.TaggedStruct("multipart", {
    expiresAt: Schema.DateTimeUtc,
    partSize: PartSizeSchema,
    parts: Schema.Array(
      Schema.Struct({
        byteSize: ByteSizeSchema,
        partNumber: PartNumberSchema,
        request: SignedRequestSchema,
      })
    ),
  }),
]);

export type UploadTarget = typeof UploadTargetSchema.Type;

/** The pending asset, and how to upload its file. */
export const PreparedUploadSchema = Schema.Struct({
  asset: MediaAsset,
  target: UploadTargetSchema,
});

export type PreparedUpload = typeof PreparedUploadSchema.Type;

/**
 * Checks the declared content type and size, records a pending asset, and
 * signs the upload: one PUT for small files, parts for large videos. The
 * file then goes from the client straight to the store, and
 * `completeUpload` checks it arrived.
 */
export const createUpload = Effect.fn("Media.createUpload")(
  function* createUpload(request: CreateUploadRequest) {
    const accepted = yield* Effect.fromResult(
      acceptUpload(request.contentType, request.byteSize)
    );

    const policy = yield* CurrentUploadPolicy;
    const storage = yield* MediaStorage;
    const assets = yield* MediaAssets;
    const id = yield* newId(MediaAssetIdSchema);
    const now = yield* DateTime.now;
    const { workspaceId } = request;
    const plan = planUpload(accepted.byteSize, policy);

    if (plan._tag === "single") {
      const asset = startUpload(
        { accepted, id, upload: { _tag: "single" }, workspaceId },
        now
      );

      yield* assets.insert(asset);

      const signed = yield* storage.signUpload({
        byteSize: asset.byteSize,
        contentType: asset.contentType,
        expiresIn: policy.singleUploadExpiry,
        key: asset.storageKey,
      });

      const prepared: PreparedUpload = {
        asset,
        target: {
          _tag: "single",
          expiresAt: DateTime.addDuration(now, policy.singleUploadExpiry),
          request: signed,
        },
      };

      return prepared;
    }

    // The store opens the upload first, because the asset records its id.
    const uploadId = yield* storage.startMultipartUpload(
      storageKeyFor(workspaceId, id, accepted.contentType),
      accepted.contentType
    );

    const asset = startUpload(
      {
        accepted,
        id,
        upload: { _tag: "multipart", partSize: plan.partSize, uploadId },
        workspaceId,
      },
      now
    );

    yield* assets.insert(asset);

    const upload = { key: asset.storageKey, uploadId };

    const parts = yield* Effect.forEach(
      plannedParts(asset.byteSize, plan.partSize),
      (part) =>
        storage
          .signUploadPart({ expiresIn: policy.partUploadExpiry, part, upload })
          .pipe(Effect.map((signed) => ({ ...part, request: signed })))
    );

    const prepared: PreparedUpload = {
      asset,
      target: {
        _tag: "multipart",
        expiresAt: DateTime.addDuration(now, policy.partUploadExpiry),
        partSize: plan.partSize,
        parts,
      },
    };

    return prepared;
  }
);
