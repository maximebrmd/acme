import { Effect } from "effect";

import { getAsset } from "#media/application/ports/media-assets.ts";
import { completeUpload } from "#media/application/use-cases/complete-upload.ts";
import type { CompleteUploadRequest } from "#media/application/use-cases/complete-upload.ts";
import { probeMedia } from "#media/application/use-cases/probe-media.ts";

/**
 * What a client calls once it sent the file: completes the upload, then
 * probes the file, and answers with the asset as both left it. A file that
 * cannot be probed is still uploaded: the asset stays uploaded with the
 * reason, and calling this again probes it again. When another call moved
 * the asset on meanwhile, the answer is the asset as it now stands.
 */
export const finishUpload = Effect.fn("Media.finishUpload")(
  function* finishUpload(request: CompleteUploadRequest) {
    const completed = yield* completeUpload(request);

    if (completed.status._tag !== "uploaded") {
      return completed;
    }

    return yield* probeMedia(request).pipe(
      Effect.map(({ asset }) => asset),
      Effect.catchTags({
        InvalidMediaTransition: () => completeUpload(request),
        // The failure is recorded on the asset.
        MediaProbeFailed: () => getAsset(request.workspaceId, request.assetId),
      })
    );
  }
);
