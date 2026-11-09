import { Layer } from "effect";
import { Digest, Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import type { AttachableMedia } from "#publishing/application/attachable-media.ts";
import type { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { RoutedPlatformPublisher } from "#publishing/application/routed-platform-publisher.ts";
import type { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import { ChannelAccessCredentials } from "#publishing/infrastructure/channel-access-credentials.ts";
import {
  ChannelGateLive,
  GatedPlatformPublisher,
} from "#publishing/infrastructure/channel-gate.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzlePublicationJournal } from "#publishing/infrastructure/drizzle-publication-journal.ts";
import { LibraryAttachableMedia } from "#publishing/infrastructure/library-attachable-media.ts";
import { LibraryMediaForPublishing } from "#publishing/infrastructure/library-media-for-publishing.ts";
import { ListedWorkspaceChannels } from "#publishing/infrastructure/listed-workspace-channels.ts";
import { LoggedChannelHealth } from "#publishing/infrastructure/logged-channel-health.ts";
import { NotifiedPublicationOutcomes } from "#publishing/infrastructure/notified-publication-outcomes.ts";
import { PlatformClientsLive } from "#publishing/infrastructure/platforms/platform-clients-live.ts";
import { WorkflowPublicationScheduler } from "#publishing/infrastructure/workflow-publication-scheduler.ts";
import { PublishPostV1Live } from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1Live } from "#publishing/infrastructure/workflows/publish-target.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

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
 * context lists, and media the ready media its library holds, which the
 * composition root provides (ListChannels, MediaLibrary). How each target
 * ends is told through the notifications context (Notify), naming channels
 * as the channels context has them (ChannelRepository).
 */
export const PublishingLive = NotifiedPublicationOutcomes.pipe(
  Layer.provideMerge(
    publishingWith(
      Layer.mergeAll(ListedWorkspaceChannels, LibraryAttachableMedia)
    )
  )
);

// The posts endpoints. They need the use cases PublishingLive provides, and
// the Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { PostsHandlers as PostsApiLive } from "#publishing/api/posts.ts";

/**
 * Registers the publishing workflows and the channel gates, which call the
 * platforms through `platforms`. Needs the cluster and what PublishingLive
 * provides, PublicationOutcomes included.
 */
export const publishingWorkers = <E, R>(
  platforms: Layer.Layer<PlatformPublisher, E, R>
) =>
  Layer.mergeAll(PublishPostV1Live, PublishTargetV1Live).pipe(
    Layer.provide(GatedPlatformPublisher),
    Layer.merge(ChannelGateLive.pipe(Layer.provide(platforms)))
  );

/**
 * The platforms the gates publish to, Mastodon, Bluesky, Threads, Instagram
 * and Facebook Pages, with the tokens
 * the channels context hands out (ChannelAccess) and the files the media
 * context does (MediaForPlatforms), which the composition root provides
 * with Dns and the PostRepository.
 */
export const PlatformsLive = RoutedPlatformPublisher.pipe(
  Layer.provide(PlatformClientsLive),
  Layer.provide(
    Layer.mergeAll(ChannelAccessCredentials, LibraryMediaForPublishing)
  ),
  Layer.provide(OutboundGuard.layer),
  Layer.provide(
    Layer.mergeAll(
      FetchHttpClient.layer,
      Mac.layerWebCrypto,
      Digest.layerWebCrypto
    ).pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);

/** The workers as the server runs them, publishing to the platforms. */
export const PublishingWorkersLive = publishingWorkers(PlatformsLive);
