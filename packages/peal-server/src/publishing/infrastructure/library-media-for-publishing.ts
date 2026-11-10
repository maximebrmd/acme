import { Effect, Layer, Stream } from "effect";

import { MediaForPlatforms } from "#media/application/media-for-platforms.ts";
import type { PlatformMedia } from "#media/application/media-for-platforms.ts";
import type { MediaNotPublishable } from "#media/application/media-not-publishable.ts";
import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type {
  MediaFailure,
  PublishableMedia,
} from "#publishing/application/media-for-publishing.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";

const publishableOf = (media: PlatformMedia): PublishableMedia => ({
  byteSize: media.byteSize,
  contentType: media.contentType,
  dimensions: media.dimensions,
  duration: media.duration,
  fileName: media.fileName,
  kind: media.kind,
  mediaId: media.assetId,
});

// Deleted, or not ready since the post was scheduled: the post cannot show
// it. The store not answering is worth another attempt.
const failureOf = (
  failure: MediaNotPublishable | MediaStorageFailed
): MediaFailure =>
  failure._tag === "MediaNotPublishable"
    ? new MediaRejected({ code: ownRefusalCodes.mediaRemoved })
    : new PlatformUnavailable();

const logged = (failure: MediaNotPublishable | MediaStorageFailed) =>
  Effect.logWarning("A post's media could not be read", failure).pipe(
    Effect.andThen(Effect.fail(failureOf(failure)))
  );

const loggedStream = (failure: MediaNotPublishable | MediaStorageFailed) =>
  Stream.fromEffect(logged(failure));

/** The post's media, as the media context hands it to platforms. */
export const LibraryMediaForPublishing = Layer.effect(
  MediaForPublishing,
  Effect.gen(function* LibraryMediaForPublishing() {
    const media = yield* MediaForPlatforms;

    return MediaForPublishing.of({
      describe: (workspaceId, mediaId) =>
        media
          .describe(workspaceId, mediaId)
          .pipe(Effect.map(publishableOf), Effect.catch(logged)),
      held: (workspaceId, mediaId) =>
        Effect.succeed(
          media.read(workspaceId, mediaId).pipe(Stream.catch(loggedStream))
        ),
      open: (workspaceId, mediaId) =>
        media.read(workspaceId, mediaId).pipe(Stream.catch(loggedStream)),
      publicUrl: (workspaceId, mediaId, expiresIn) =>
        media
          .publicUrl(workspaceId, mediaId, expiresIn)
          .pipe(Effect.catch(logged)),
    });
  })
);
