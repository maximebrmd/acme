import { Array as Arr, Effect, Layer, Option } from "effect";

import { MediaLibrary } from "#media/application/media-library.ts";
import { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { MediaFile } from "#publishing/domain/media-file.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";

/**
 * The media posts may show, as the media context's library shows them to
 * the actor (which needs media:read): ready media of the actor's workspace,
 * with what probing found. Another workspace's media is not found there, and
 * media still uploading, waiting for a probe or rejected is left out.
 *
 * Each asset is read on its own, one after the other: a post shows at most
 * 20, and the lookup can run in the transaction that locks the post, on one
 * connection.
 */
export const LibraryAttachableMedia = Layer.effect(
  AttachableMedia,
  Effect.gen(function* LibraryAttachableMedia() {
    const library = yield* MediaLibrary;

    const fileOf = (actor: Actor, mediaId: MediaAssetId) =>
      library.getMedia(actor, mediaId).pipe(
        Effect.map(({ asset }) =>
          asset.status._tag === "ready"
            ? Option.some(
                new MediaFile({
                  byteSize: asset.byteSize,
                  contentType: asset.contentType,
                  dimensions: asset.metadata.dimensions,
                  duration: asset.metadata.duration,
                  mediaId: asset.id,
                })
              )
            : Option.none()
        ),
        Effect.catchTags({
          MediaAssetNotFound: () => Effect.succeedNone,
          // The library also signs an address for the file, which posts do
          // not need: failing to means the store's settings are wrong.
          MediaStorageFailed: Effect.die,
        })
      );

    return AttachableMedia.of({
      lookUp: (actor, mediaIds) =>
        Effect.all(mediaIds.map((mediaId) => fileOf(actor, mediaId))).pipe(
          Effect.map(Arr.getSomes)
        ),
    });
  })
);
