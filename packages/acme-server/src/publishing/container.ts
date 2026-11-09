import { Layer } from "effect";

import type { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import {
  ChannelGateLive,
  GatedPlatformPublisher,
} from "#publishing/infrastructure/channel-gate.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzlePublicationJournal } from "#publishing/infrastructure/drizzle-publication-journal.ts";
import { LoggedChannelHealth } from "#publishing/infrastructure/logged-channel-health.ts";
import { UnsupportedPlatformPublisher } from "#publishing/infrastructure/unsupported-platform-publisher.ts";
import { WorkflowPublicationScheduler } from "#publishing/infrastructure/workflow-publication-scheduler.ts";
import { PublishPostV1Live } from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1Live } from "#publishing/infrastructure/workflows/publish-target.ts";

/**
 * The publishing context's use cases (`PostScheduling`, for the handlers)
 * and the adapters behind its ports. Needs the database (Drizzle), the
 * workflow engine, a TransactionRunner and Ids.
 */
export const PublishingLive = PostScheduling.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzlePostRepository,
      DrizzlePublicationJournal,
      LoggedChannelHealth,
      WorkflowPublicationScheduler
    )
  )
);

/**
 * Registers the publishing workflows and the channel gates, which call the
 * platforms through `platforms`. Needs the cluster and what PublishingLive
 * provides.
 */
export const publishingWorkers = <E, R>(
  platforms: Layer.Layer<PlatformPublisher, E, R>
) =>
  Layer.mergeAll(PublishPostV1Live, PublishTargetV1Live).pipe(
    Layer.provide(GatedPlatformPublisher),
    Layer.merge(ChannelGateLive.pipe(Layer.provide(platforms)))
  );

/** The workers as the server runs them, with no platform adapter yet. */
export const PublishingWorkersLive = publishingWorkers(
  UnsupportedPlatformPublisher
);
