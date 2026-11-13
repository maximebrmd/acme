import { Effect, Option, Stream } from "effect";

import { GeneratedImageUnusable } from "#media/application/generated-image-unusable.ts";
import {
  keepArriving,
  roomIn,
  storeArriving,
} from "#media/application/use-cases/arrived-file.ts";
import { deleteMedia } from "#media/application/use-cases/delete-media.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { kindOf, maxByteSize } from "#media/domain/media-format.ts";
import { newId } from "#shared/application/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** An image the writing assistant made, for a workspace. */
export interface GeneratedImageRequest {
  /** The file, exactly as the provider gave it. */
  readonly bytes: Uint8Array;
  readonly workspaceId: WorkspaceId;
}

/**
 * Whether the workspace's storage has room for the largest image the
 * library takes: asked before an image is made, so a full plan spends
 * nothing (`PlanLimitReached` `mediaStorage`).
 */
export const roomForImage = Effect.fn("Media.roomForImage")(
  function* roomForImage(workspaceId: WorkspaceId) {
    yield* roomIn(workspaceId, maxByteSize.image);
  }
);

/**
 * Stores an image the writing assistant made as media of the workspace,
 * marked as made by AI, with no description: the third way a file arrives,
 * after an upload and an import, sharing the import's second half. The
 * bytes are stored as they came, never re-encoded, so whatever the
 * provider wrote in the file stays in it. Bytes that are not an image the
 * library takes, or that the probe cannot read, leave nothing behind and
 * fail with `GeneratedImageUnusable`.
 */
export const storeGenerated = Effect.fn("Media.storeGenerated")(
  function* storeGenerated({ bytes, workspaceId }: GeneratedImageRequest) {
    const room = yield* roomIn(workspaceId, 1);
    const id = yield* newId(MediaAssetIdSchema);

    const item = yield* keepArriving(
      { aiGenerated: true, altText: Option.none(), id, room, workspaceId },
      storeArriving(
        {
          declaredSize: Option.some(bytes.byteLength),
          declaredType: Option.none(),
          rest: Stream.empty,
          start: bytes,
        },
        {
          accepts: (contentType) => kindOf(contentType) === "image",
          id,
          room,
          workspaceId,
        }
        // A file the assistant made was never called anything.
      ).pipe(Effect.map((stored) => ({ fileName: Option.none(), stored })))
    ).pipe(
      Effect.catchTags({
        MediaTooLarge: () => Effect.fail(new GeneratedImageUnusable()),
        UnsupportedMediaType: () => Effect.fail(new GeneratedImageUnusable()),
        // The probe found another format than the bytes start with: the
        // file is gone already.
        UploadRejected: () => Effect.fail(new GeneratedImageUnusable()),
      })
    );

    // A picture the probe could not read is no use to anyone.
    if (item.asset.status._tag !== "ready") {
      yield* deleteMedia({ assetId: id, workspaceId });

      return yield* new GeneratedImageUnusable();
    }

    return item;
  }
);
