import { Schema } from "effect";

import { PartSizeSchema } from "./upload-plan.ts";

/** The store's id for a multipart upload in progress. */
export const MultipartUploadIdSchema = Schema.NonEmptyString.pipe(
  Schema.brand("MultipartUploadId")
);

export type MultipartUploadId = typeof MultipartUploadIdSchema.Type;

/** How the client sends a pending file. */
export const UploadMethodSchema = Schema.Union([
  // One presigned PUT.
  Schema.TaggedStruct("single", {}),
  // Presigned PUTs of `partSize` bytes each but the last, which the store
  // joins once every part has arrived.
  Schema.TaggedStruct("multipart", {
    partSize: PartSizeSchema,
    uploadId: MultipartUploadIdSchema,
  }),
]);

export type UploadMethod = typeof UploadMethodSchema.Type;

/** Why a stored file was refused. */
export const RejectionReasonSchema = Schema.Literals([
  // The stored file's size is not the size the client declared.
  "sizeMismatch",
  // The stored file's content type is not the one the client declared.
  "typeMismatch",
]);

export type RejectionReason = typeof RejectionReasonSchema.Type;

/** Why a probe could not read a file. */
export const ProbeFailureReasonSchema = Schema.Literals([
  // The file is damaged, or not in a format the probe reads.
  "unreadable",
  // Reading it took longer than the probe allows.
  "timedOut",
  // The store served more bytes than peal stores for the file's kind.
  "tooLarge",
  // The probing program could not run, or printed nothing it understands.
  "toolFailed",
]);

export type ProbeFailureReason = typeof ProbeFailureReasonSchema.Type;

/**
 * Why an uploaded file is not ready yet: it has not been probed, this server
 * has no probe for its kind (ffprobe is not installed, for a video), or the
 * probe could not read it. Probing it again, once the cause is gone, can
 * still make it ready.
 */
export const ProbeStateSchema = Schema.Literals([
  "pending",
  "unavailable",
  ...ProbeFailureReasonSchema.literals,
]);

export type ProbeState = typeof ProbeStateSchema.Type;

/**
 * Where a file is in its life:
 *
 * | From     | To                                   |
 * | -------- | ------------------------------------ |
 * | pending  | uploaded, rejected                   |
 * | uploaded | uploaded, ready, rejected            |
 * | ready    | nothing                              |
 * | rejected | nothing: the stored file was deleted |
 *
 * An uploaded file stays uploaded, with the reason, when it cannot be
 * probed.
 */
export const MediaStatusSchema = Schema.Union([
  // Recorded, and waiting for the client to upload the file.
  Schema.TaggedStruct("pending", { upload: UploadMethodSchema }),
  // Stored with the declared size and content type, and not probed yet.
  Schema.TaggedStruct("uploaded", { probe: ProbeStateSchema }),
  // Probed, and usable in posts.
  Schema.TaggedStruct("ready", {}),
  Schema.TaggedStruct("rejected", { reason: RejectionReasonSchema }),
]);

export type MediaStatus = typeof MediaStatusSchema.Type;

export const MediaStatusNameSchema = Schema.Literals([
  "pending",
  "uploaded",
  "ready",
  "rejected",
]);

export type MediaStatusName = MediaStatus["_tag"];
