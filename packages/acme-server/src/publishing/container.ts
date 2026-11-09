import { Layer } from "effect";

import type { AttachableMedia } from "#publishing/application/attachable-media.ts";
import type { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import {
  ChannelGateLive,
  GatedPlatformPublisher,
} from "#publishing/infrastructure/channel-gate.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzlePublicationJournal } from "#publishing/infrastructure/drizzle-publication-journal.ts";
import { ListedWorkspaceChannels } from "#publishing/infrastructure/listed-workspace-channels.ts";
import { LoggedChannelHealth } from "#publishing/infrastructure/logged-channel-health.ts";
import { UnavailableAttachableMedia } from "#publishing/infrastructure/unavailable-attachable-media.ts";
import { UnsupportedPlatformPublisher } from "#publishing/infrastructure/unsupported-platform-publisher.ts";
import { WorkflowPublicationScheduler } from "#publishing/infrastructure/workflow-publication-scheduler.ts";
import { PublishPostV1Live } from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1Live } from "#publishing/infrastructure/workflows/publish-target.ts";

/**
 * The publishing context's use cases (`PostDrafts`, `PostQueries`,
 * `PostScheduling`, for the handlers) and the adapters behind its ports,
 * with `references` for the channels and media posts refer to. Needs the
 * database (Drizzle), the workflow engine, a TransactionRunner and Ids.
 */
export const publishingWith = <E, R>(
  references: Layer.Layer<AttachableMedia | WorkspaceChannels, E, R>
) =>
  Layer.mergeAll(
    PostDrafts.layer,
    PostQueries.layer,
    PostScheduling.layer
  ).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzlePostRepository,
        DrizzlePublicationJournal,
        LoggedChannelHealth,
        WorkflowPublicationScheduler,
        references
      )
    )
  );

/**
 * The use cases as the server runs them: channels are those the channels
 * context lists, which the composition root provides (ListChannels), and no
 * media can be attached until the media context can look assets up.
 */
export const PublishingLive = publishingWith(
  Layer.mergeAll(ListedWorkspaceChannels, UnavailableAttachableMedia)
);

// The posts endpoints. They need the use cases PublishingLive provides, and
// the Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { PostsHandlers as PostsApiLive } from "#publishing/api/posts.ts";

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
