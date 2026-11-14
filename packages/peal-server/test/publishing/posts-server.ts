import { Duration, Effect, Layer, Option } from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import type { AttachableMedia } from "#publishing/application/attachable-media.ts";
import type { FeedNotices } from "#publishing/application/feed-notices.ts";
import type { FeedPictures } from "#publishing/application/feed-pictures.ts";
import type { FeedSource } from "#publishing/application/feed-source.ts";
import type { FollowUpChannels } from "#publishing/application/follow-up-channels.ts";
import type { FollowUpCounts } from "#publishing/application/follow-up-counts.ts";
import { FollowUpPublisher } from "#publishing/application/follow-up-publisher.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import type { RecyclingActors } from "#publishing/application/recycling-actors.ts";
import type { RecyclingNotices } from "#publishing/application/recycling-notices.ts";
import { ShortLinkDefaults } from "#publishing/application/short-link-defaults.ts";
import {
  FeedsUnused,
  FollowUpsUnused,
  publishingBehind,
  publishingWorkers,
  RecyclingUnused,
  UnreadComments,
} from "#publishing/container.ts";
import { UnreadMetrics } from "#publishing/infrastructure/channel-gate.ts";
import { FakePlatformPublisher } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { ListedWorkspaceChannels } from "#publishing/infrastructure/listed-workspace-channels.ts";
import type { MediaAssetId, WorkspaceId } from "#shared/domain/ids.ts";
import { MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { freshChannel, syntheticCredentials } from "#test/channels/support.ts";
import {
  FakeHolds,
  FakeLivePostClients,
  RecordedLiveEvents,
  RepositoryCredentials,
} from "#test/publishing/fakes/fake-live-post-clients.ts";
import {
  clusterOver,
  DatabaseTest,
  setTime,
} from "#test/publishing/infrastructure/harness.ts";
import { RecordingPublicationOutcomes } from "#test/publishing/infrastructure/recorded-outcomes.ts";
import {
  attachableMedia,
  mediaFile,
  postAllowance,
} from "#test/publishing/support.ts";

// The publishing use cases as the server runs them, on an in-memory cluster
// driven by TestClock: posts go to the channels the channels context lists
// from Postgres, through the real adapter, and a fake platform publishes
// them. Ids are random, so tests never meet each other's rows.

/** The image posts may show here. */
export const attachableImage: MediaAssetId = MediaAssetIdSchema.make(
  "00000000-0000-7000-8000-00000000a001"
);

/** The video posts may show here, for platforms that take videos only. */
export const attachableVideo: MediaAssetId = MediaAssetIdSchema.make(
  "00000000-0000-7000-8000-00000000a0f1"
);

/**
 * The server behind `gate`, which says which posts wait for an approval,
 * with the media posts may show from `media`, and the posts a month allows
 * from `allowance`.
 */
export const postsServerBehind = <G, E2, R2, E, R, H, R4>(
  gate: Layer.Layer<ApprovalGate | G, E2, R2>,
  media: Layer.Layer<AttachableMedia, E, R>,
  allowance: ReturnType<typeof postAllowance>,
  // Who hears what happens to posts, and what a test reads it with.
  events: Layer.Layer<PostEvents | H, never, R4>,
  // Who a recycling rule's starter is, and who hears it ended.
  recycling: Layer.Layer<RecyclingActors | RecyclingNotices> = RecyclingUnused,
  // What reads feeds, and who hears one stopped.
  feeds: Layer.Layer<FeedNotices | FeedPictures | FeedSource> = FeedsUnused,
  // The workspaces' short links default: by default, off everywhere.
  defaults: Layer.Layer<ShortLinkDefaults> = ShortLinkDefaults.none,
  // What channels carry of follow-up rules and the likes counted, and
  // what carries follow-ups out: by default, nothing is counted.
  followUps: Layer.Layer<
    FollowUpChannels | FollowUpCounts | FollowUpPublisher
  > = Layer.merge(FollowUpsUnused, FollowUpPublisher.none)
) =>
  publishingWorkers(
    FakePlatformPublisher,
    UnreadMetrics,
    UnreadComments,
    FakeLivePostClients,
    followUps
  ).pipe(
    Layer.provideMerge(
      publishingBehind(
        gate,
        Layer.mergeAll(ListedWorkspaceChannels, media, allowance, defaults),
        events,
        // Changes of live posts: the channels' rows say whether one can be
        // used, and FakeRemovals deletes, holds and hears.
        Layer.mergeAll(RepositoryCredentials, FakeHolds, RecordedLiveEvents),
        recycling,
        feeds,
        followUps
      )
    ),
    Layer.provideMerge(FakeLivePostClients),
    Layer.provideMerge(RecordingPublicationOutcomes),
    Layer.provideMerge(ListChannels.layer),
    Layer.provideMerge(DrizzleChannelRepository),
    Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
    Layer.provideMerge(clusterOver(MessageStorage.layerMemory)),
    Layer.provideMerge(FakePlatformPublisher),
    Layer.provideMerge(DatabaseTest)
  );

/**
 * The server, with the media posts may show from `media`, and the posts a
 * month allows from `allowance` (no limit, by default). No post waits for an
 * approval.
 */
export const postsServerWith = <E, R>(
  media: Layer.Layer<AttachableMedia, E, R>,
  allowance: ReturnType<typeof postAllowance> = postAllowance()
) => postsServerBehind(ApprovalGate.open, media, allowance, PostEvents.none);

export const PostsServerTest = postsServerWith(
  attachableMedia([
    mediaFile(attachableImage),
    mediaFile(attachableVideo, {
      contentType: "video/mp4",
      duration: Option.some(Duration.seconds(30)),
    }),
  ])
);

/** Runs `test` on a fresh server at virtual time `start`. */
export const onPostsServerAt = <A, E>(
  start: string,
  test: Effect.Effect<A, E, Layer.Success<typeof PostsServerTest> | Scope.Scope>
) =>
  setTime(start).pipe(
    Effect.andThen(test.pipe(Effect.provide(PostsServerTest)))
  );

/** A synthetic account on `platform`, connected to the workspace. */
export const connect = Effect.fn("test.connect")(function* connect(
  workspaceId: WorkspaceId,
  platform: Platform
) {
  const channel = yield* freshChannel(workspaceId, { platform });

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, syntheticCredentials(channel))
  );

  return channel.id;
});
