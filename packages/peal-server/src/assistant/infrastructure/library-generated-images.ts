import { Effect, Layer, Option } from "effect";

import { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImageNotStored } from "#assistant/application/image-not-stored.ts";
import { GeneratedImages } from "#assistant/application/ports/generated-images.ts";
import type { GeneratedImage } from "#assistant/application/ports/generated-images.ts";
import { MediaLibrary } from "#media/application/media-library.ts";
import type { MediaItem } from "#media/application/use-cases/view-media.ts";

const unusable = () => new ImageFailed({ reason: "unusableAnswer" });

// The library's asset as the assistant answers it: the media context
// stores only images, and answers only ready ones.
const generatedImageOf = (
  item: MediaItem
): Effect.Effect<GeneratedImage, ImageFailed> => {
  const { asset } = item;
  const { contentType } = asset;

  if (
    asset.status._tag !== "ready" ||
    !asset.aiGenerated ||
    contentType === "application/pdf" ||
    contentType === "video/mp4" ||
    contentType === "video/quicktime"
  ) {
    return Effect.fail(unusable());
  }

  return Effect.succeed({
    aiGenerated: true,
    altText: null,
    byteSize: asset.byteSize,
    codec: null,
    contentType,
    createdAt: asset.createdAt,
    dimensions: Option.getOrNull(asset.metadata.dimensions),
    durationMs: null,
    id: asset.id,
    kind: "image",
    pageCount: null,
    status: { _tag: "ready" },
    updatedAt: asset.updatedAt,
    url: Option.getOrNull(item.url),
  });
};

/**
 * GeneratedImages in the media context's library: the assistant's images
 * arrive there as the third way a file arrives (`storeGenerated`). The
 * composition root provides the media context's MediaLibrary.
 */
export const LibraryGeneratedImagesLive = Layer.effect(
  GeneratedImages,
  Effect.gen(function* LibraryGeneratedImagesLive() {
    const library = yield* MediaLibrary;

    return GeneratedImages.of({
      roomFor: (actor) => library.roomForImage(actor),
      store: (actor, bytes) =>
        library.storeGenerated(actor, bytes).pipe(
          Effect.catchTags({
            GeneratedImageUnusable: () => Effect.fail(unusable()),
            // Why, for whoever runs the server: the failure names the store,
            // never the image.
            MediaStorageFailed: (failure) =>
              Effect.logWarning("The media store failed", failure).pipe(
                Effect.andThen(Effect.fail(new ImageNotStored()))
              ),
          }),
          Effect.flatMap(generatedImageOf)
        ),
    });
  })
);
