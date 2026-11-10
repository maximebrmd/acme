import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { MediaForPlatforms } from "#media/application/media-for-platforms.ts";
import { MediaLibrary } from "#media/application/media-library.ts";
import { MediaStorageUsage } from "#media/application/media-storage-usage.ts";
import type { RemoteMedia } from "#media/application/ports/remote-media.ts";
import { CountedImportSlots } from "#media/infrastructure/counted-import-slots.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { DrizzleMediaRecords } from "#media/infrastructure/drizzle-media-records.ts";
import { HttpRemoteMedia } from "#media/infrastructure/http-remote-media.ts";
import { MediaProbeLive } from "#media/infrastructure/media-probe.ts";
import { PlanStorageAllowanceLive } from "#media/infrastructure/plan-storage-allowance.ts";
import { PublishingMediaUsage } from "#media/infrastructure/publishing-media-usage.ts";
import {
  S3MediaFoldersLive,
  S3MediaStorageLive,
} from "#media/infrastructure/s3-media-storage.ts";
import { webhookMediaAssets } from "#media/infrastructure/webhook-media-assets.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

export { MediaLibrary } from "#media/application/media-library.ts";

// The media endpoints. They need the use cases MediaLive provides, and the
// Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { MediaHandlers as MediaApiLive } from "#media/api/media.ts";

/**
 * The media context: its use cases on the S3 store, Postgres, sharp and
 * ffprobe, for members (MediaLibrary), for the platforms posts go out on
 * (MediaForPlatforms), and for the workspace context's exports and erasures
 * (MediaRecords), and what each workspace stores, for the billing page
 * (MediaStorageUsage), fetching the files members import from `remote`.
 * The composition root provides `Drizzle` and `Ids`, the publishing
 * context's MediaInPosts, which says where posts show media, the billing
 * context's WorkspaceEntitlements, whose plans limit storage, the webhooks
 * context's WebhookEvents, which hear how uploads and imports end, a
 * TransactionRunner, and the environment the store's settings (see
 * s3-media-storage.ts).
 */
export const mediaWith = <E, R>(remote: Layer.Layer<RemoteMedia, E, R>) =>
  Layer.mergeAll(
    MediaLibrary.layer,
    MediaForPlatforms.layer,
    MediaStorageUsage.layer,
    DrizzleMediaRecords.pipe(Layer.provide(S3MediaFoldersLive))
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        webhookMediaAssets(DrizzleMediaAssetsLive),
        MediaProbeLive,
        S3MediaStorageLive,
        PublishingMediaUsage,
        PlanStorageAllowanceLive,
        CountedImportSlots,
        remote
      )
    )
  );

/**
 * The files members import, fetched from public hosts only, through the
 * OutboundGuard, which resolves their names with the runtime's Dns.
 */
export const RemoteMediaLive = HttpRemoteMedia.pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);

/** The media context as the server runs it. Needs Dns too. */
export const MediaLive = mediaWith(RemoteMediaLive);
