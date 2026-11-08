import { Layer } from "effect";

import { MediaLibrary } from "#media/application/media-library.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { MediaProbeLive } from "#media/infrastructure/media-probe.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";

export { MediaLibrary } from "#media/application/media-library.ts";

/**
 * The media context: its use cases on the S3 store, Postgres, sharp and
 * ffprobe. The composition root provides `Drizzle` and `Ids`, and the
 * environment the store's settings (see s3-media-storage.ts).
 */
export const MediaLive = MediaLibrary.layer.pipe(
  Layer.provide(
    Layer.mergeAll(DrizzleMediaAssetsLive, MediaProbeLive, S3MediaStorageLive)
  )
);
