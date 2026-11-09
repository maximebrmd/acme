import { Schema } from "effect";

/**
 * Why an upload failed, as the uploader explains it: each reason has its
 * message under MediaUploader.errors in the catalogues.
 */
export const UploadFailureReasonSchema = Schema.Literals([
  // The API refused the file before it was sent.
  "unsupportedType",
  "tooLarge",
  "altTextTooLong",
  "forbidden",
  "signedOut",
  "workspaceNotFound",
  // Sending it failed.
  "network",
  "linkExpired",
  "storeRefused",
  "storeUnavailable",
  // The API checked what arrived.
  "incomplete",
  "rejectedSize",
  "rejectedType",
  // Anything else: an answer the app does not understand.
  "unexpected",
]);

export type UploadFailureReason = typeof UploadFailureReasonSchema.Type;

/**
 * An upload that did not go through. `limit` is the largest size of the
 * file's kind in bytes, or the longest description in characters, when
 * the reason is about one.
 */
export class UploadFailed extends Schema.TaggedError<UploadFailed>()(
  "UploadFailed",
  {
    limit: Schema.optionalKey(Schema.Int),
    reason: UploadFailureReasonSchema,
  }
) {}
