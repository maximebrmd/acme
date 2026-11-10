import { Duration, Effect, Layer, Option } from "effect";

import { MediaForPlatforms } from "#media/application/media-for-platforms.ts";
import { MediaPreviews } from "#review/application/ports/media-previews.ts";

/** How long a file's link works: long enough to read a post and decide. */
export const previewLifetime = Duration.hours(2);

/**
 * The files of a post under review, from the media context's
 * MediaForPlatforms, which hands out only ready media of the post's
 * workspace: each as a link to the media store that works for two hours.
 * A file it cannot hand out has no preview, and why is logged without its
 * link.
 */
export const LibraryMediaPreviews = Layer.effect(
  MediaPreviews,
  Effect.gen(function* LibraryMediaPreviews() {
    const media = yield* MediaForPlatforms;

    return MediaPreviews.of({
      of: (workspaceId, mediaId) =>
        Effect.all({
          described: media.describe(workspaceId, mediaId),
          url: media.publicUrl(workspaceId, mediaId, previewLifetime),
        }).pipe(
          // A document has no preview yet: the page says the file cannot
          // be shown.
          Effect.map(({ described, url }) =>
            described.kind === "document"
              ? Option.none()
              : Option.some({
                  contentType: described.contentType,
                  kind: described.kind,
                  url,
                })
          ),
          Effect.catchTags({
            MediaNotPublishable: () => Effect.succeedNone,
            MediaStorageFailed: () =>
              Effect.logWarning(
                "The media store could not hand out a file under review"
              ).pipe(Effect.as(Option.none())),
          })
        ),
    });
  })
);
