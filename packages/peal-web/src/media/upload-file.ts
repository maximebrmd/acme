import { Effect, Option } from "effect";
import type { Media, NewUpload, PreparedUpload } from "peal-contract";

import { withRetry } from "#media/retry.ts";
import type { TransferFailed } from "#media/transfer-failed.ts";
import { Transfer } from "#media/transfer.ts";
import { UploadFailed } from "#media/upload-failed.ts";
import { partConcurrency, progressOf, slicesOf } from "#media/upload-plan.ts";
import type { FileSlice } from "#media/upload-plan.ts";

/** What an upload asks of the API, in one workspace. */
export interface UploadApi {
  readonly create: (
    upload: NewUpload
  ) => Effect.Effect<PreparedUpload, UploadFailed>;
  readonly complete: (mediaId: string) => Effect.Effect<Media, UploadFailed>;
  /** Deletes media whose upload failed or was canceled. */
  readonly discard: (mediaId: string) => Effect.Effect<void>;
}

/** What the uploader shows while a file goes. */
export interface UploadEvents {
  /** The API recorded the media, which can now be described. */
  readonly onPrepared: (media: Media) => void;
  /** How much of the file has gone, from 0 to 1. */
  readonly onProgress: (fraction: number) => void;
  /** Every byte arrived: the API checks and probes the file. */
  readonly onCompleting: () => void;
}

const transferFailure = ({ status }: TransferFailed): UploadFailed => {
  if (status === null) {
    return new UploadFailed({ reason: "network" });
  }

  // The store refuses a signature that expired with 403.
  return new UploadFailed({
    reason: status === 403 ? "linkExpired" : "storeRefused",
  });
};

/**
 * Uploads a file: the API records the media and signs the requests, the
 * file goes straight to the store, in parts at once for a large video,
 * each request tried again while that may work, then the API checks and
 * probes it. A single upload only creates the file, so a 412 on a new try
 * means an earlier one stored it.
 *
 * Interrupting it cancels it: the requests are aborted and the media
 * deleted, as it is when sending fails or the API refuses what arrived.
 */
export const uploadFile = Effect.fn("uploadFile")(function* uploadFile(
  api: UploadApi,
  file: Blob,
  options: { readonly altText: string; readonly events: UploadEvents }
) {
  const { events } = options;
  const transfer = yield* Transfer;
  const altText = options.altText.trim();

  const prepared = yield* api.create({
    altText: altText === "" ? null : altText,
    byteSize: file.size,
    contentType: file.type,
    // A file the person chose has a name, which the library finds it by.
    fileName: file instanceof File ? file.name : null,
  });

  const mediaId = prepared.media.id;

  events.onPrepared(prepared.media);

  const sent = new Map<number, number>();

  const report = (slice: FileSlice, bytes: number) => {
    sent.set(slice.partNumber, Math.min(bytes, slice.end - slice.start));
    events.onProgress(progressOf(sent, file.size));
  };

  const send = (slice: FileSlice) =>
    withRetry(
      transfer.put(
        slice.request,
        file.slice(slice.start, slice.end),
        (bytes) => {
          report(slice, bytes);
        }
      )
    ).pipe(
      Effect.catchIf(
        (failure) =>
          prepared.upload._tag === "single" && failure.status === 412,
        () => Effect.void
      ),
      Effect.tap(() =>
        Effect.sync(() => {
          report(slice, slice.end - slice.start);
        })
      )
    );

  const sendAndCheck = Effect.gen(function* sendAndCheck() {
    yield* Option.match(slicesOf(prepared.upload, file.size), {
      onNone: () => Effect.fail(new UploadFailed({ reason: "unexpected" })),
      onSome: (slices) =>
        Effect.forEach(slices, send, {
          concurrency: partConcurrency,
          discard: true,
        }).pipe(Effect.mapError(transferFailure)),
    });

    events.onCompleting();

    return yield* api.complete(mediaId);
  });

  // Once the media exists, an upload that does not end with it uploaded
  // deletes it, while sending or while the API checks the file: nothing is
  // left pending or rejected, and trying again starts afresh.
  return yield* sendAndCheck.pipe(Effect.onError(() => api.discard(mediaId)));
});
