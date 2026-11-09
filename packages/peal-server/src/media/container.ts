import { Layer } from "effect";

import { MediaForPlatforms } from "#media/application/media-for-platforms.ts";
import { MediaLibrary } from "#media/application/media-library.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { DrizzleMediaRecords } from "#media/infrastructure/drizzle-media-records.ts";
import { MediaProbeLive } from "#media/infrastructure/media-probe.ts";
import { PublishingMediaUsage } from "#media/infrastructure/publishing-media-usage.ts";
import {
  S3MediaFoldersLive,
  S3MediaStorageLive,
} from "#media/infrastructure/s3-media-storage.ts";

export { MediaLibrary } from "#media/application/media-library.ts";

// The media endpoints. They need the use cases MediaLive provides, and the
// Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { MediaHandlers as MediaApiLive } from "#media/api/media.ts";

/**
 * The media context: its use cases on the S3 store, Postgres, sharp and
 * ffprobe, for members (MediaLibrary), for the platforms posts go out on
 * (MediaForPlatforms), and for the workspace context's exports and erasures
 * (MediaRecords). The composition root provides `Drizzle` and `Ids`, the
 * publishing context's MediaInPosts, which says where posts show media, and
 * the environment the store's settings (see s3-media-storage.ts).
 */
export const MediaLive = Layer.mergeAll(
  MediaLibrary.layer,
  MediaForPlatforms.layer,
  DrizzleMediaRecords.pipe(Layer.provide(S3MediaFoldersLive))
).pipe(
  Layer.provide(
    Layer.mergeAll(
      DrizzleMediaAssetsLive,
      MediaProbeLive,
      S3MediaStorageLive,
      PublishingMediaUsage
    )
  )
);
