import { Effect } from "effect";
import {
  AltTextTooLong,
  Forbidden,
  MediaStoreUnavailable,
  MediaTooLarge,
  PlanLimitReached,
  Unauthenticated,
  UnsupportedMediaType,
  UploadIncomplete,
  UploadRejected,
  WorkspaceNotFound,
} from "peal-contract";

import type { PealApi } from "#api/client.ts";
import { UploadFailed } from "#media/upload-failed.ts";
import type { UploadFailureReason } from "#media/upload-failed.ts";
import type { UploadApi } from "#media/upload-file.ts";

type Client = (typeof PealApi)["Service"];

// What the endpoints an upload calls can fail with: their errors, and the
// transport's and decoding's.
type ApiFailure =
  | Effect.Error<ReturnType<Client["media"]["complete"]>>
  | Effect.Error<ReturnType<Client["media"]["create"]>>;

// The answers that need nothing more than their reason.
const reasons: readonly (readonly [
  new (...args: never[]) => object,
  UploadFailureReason,
])[] = [
  [Forbidden, "forbidden"],
  [MediaStoreUnavailable, "storeUnavailable"],
  [Unauthenticated, "signedOut"],
  [UnsupportedMediaType, "unsupportedType"],
  [UploadIncomplete, "incomplete"],
  [WorkspaceNotFound, "workspaceNotFound"],
];

/**
 * What an answer of the media endpoints means for the person uploading.
 * Anything else, such as a transport or decoding failure, is unexpected.
 */
export const failureOf = (error: ApiFailure): UploadFailed => {
  if (error instanceof AltTextTooLong) {
    return new UploadFailed({
      limit: error.maxLength,
      reason: "altTextTooLong",
    });
  }

  if (error instanceof MediaTooLarge) {
    return new UploadFailed({ limit: error.maxByteSize, reason: "tooLarge" });
  }

  if (error instanceof PlanLimitReached && error.limit === "mediaStorage") {
    return new UploadFailed({ limit: error.allowed, reason: "storageFull" });
  }

  if (error instanceof UploadRejected) {
    return new UploadFailed({
      reason: error.reason === "sizeMismatch" ? "rejectedSize" : "rejectedType",
    });
  }

  const known = reasons.find(([kind]) => error instanceof kind);

  return new UploadFailed({ reason: known?.[1] ?? "unexpected" });
};

/** The media endpoints of one workspace, as an upload uses them. */
export const uploadApiOf = (
  client: Client,
  workspaceId: string
): UploadApi => ({
  complete: (mediaId) =>
    client.media
      .complete({ params: { mediaId, workspaceId } })
      .pipe(Effect.mapError(failureOf)),
  create: (upload) =>
    client.media
      .create({ params: { workspaceId }, payload: upload })
      .pipe(Effect.mapError(failureOf)),
  discard: (mediaId) =>
    client.media
      .delete({ params: { mediaId, workspaceId } })
      .pipe(Effect.ignore),
});
