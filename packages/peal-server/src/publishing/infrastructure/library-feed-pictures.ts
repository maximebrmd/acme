import { Effect, Layer, Option } from "effect";

import { MediaLibrary } from "#media/application/media-library.ts";
import { FeedPictures } from "#publishing/application/feed-pictures.ts";
import type { FeedPicture } from "#publishing/application/feed-pictures.ts";
import type { FeedPictureSkip } from "#publishing/domain/feed-item-outcome.ts";
import { maxAltTextLength } from "#publishing/domain/media-attachment.ts";

const skipped = (reason: FeedPictureSkip) =>
  Effect.succeed<FeedPicture>({ _tag: "skipped", reason });

/**
 * FeedPictures through the media context's import from an address
 * (`MediaLibrary.importMedia`, the one behind `POST …/media/import`), as
 * the feed's starter, who needs media:upload. Only a ready image is
 * attached: a file that is not one, or that its probe refused, stays in
 * the library unattached, as a crash between the import and the item's
 * transaction may leave one.
 */
export const LibraryFeedPictures = Layer.effect(
  FeedPictures,
  Effect.gen(function* LibraryFeedPictures() {
    const library = yield* MediaLibrary;

    return FeedPictures.of({
      attach: (actor, url, altText) =>
        library
          .importMedia(actor, {
            altText: Option.some(altText.slice(0, maxAltTextLength)).pipe(
              Option.filter((text) => text.length > 0)
            ),
            // Only an image is fetched whole and stored: a video or a
            // document is refused from its first bytes.
            kinds: ["image"],
            url,
          })
          .pipe(
            Effect.flatMap(({ asset }) =>
              asset.status._tag === "ready" &&
              asset.contentType.startsWith("image/")
                ? Effect.succeed<FeedPicture>({
                    _tag: "attached",
                    mediaId: asset.id,
                  })
                : skipped("notAnImage")
            ),
            Effect.catchTags({
              AltTextTooLong: () => skipped("failed"),
              MediaImportBusy: () => skipped("busy"),
              MediaSourceNotPublic: () => skipped("notPublic"),
              MediaSourceUnreachable: () => skipped("unreachable"),
              MediaStorageFailed: () => skipped("failed"),
              MediaTooLarge: () => skipped("tooLarge"),
              MissingPermission: () => skipped("notAllowed"),
              PlanLimitReached: () => skipped("storageFull"),
              UnsupportedMediaType: () => skipped("notAnImage"),
              UploadRejected: () => skipped("notAnImage"),
            }),
            // A defect of the media context is a skipped picture, said.
            Effect.catchDefect((defect) =>
              Effect.logWarning(
                "A feed item's picture could not be imported",
                defect
              ).pipe(Effect.andThen(skipped("failed")))
            )
          ),
    });
  })
);
