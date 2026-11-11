import { Duration, Effect, Layer, Option } from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import type { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import {
  publishingBehind,
  publishingWorkers,
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
  events: Layer.Layer<PostEvents | H, never, R4>
) =>
  publishingWorkers(
    FakePlatformPublisher,
    UnreadMetrics,
    UnreadComments,
    FakeLivePostClients
  ).pipe(
    Layer.provideMerge(
      publishingBehind(
        gate,
        Layer.mergeAll(ListedWorkspaceChannels, media, allowance),
        events,
        // Changes of live posts: the channels' rows say whether one can be
        // used, and FakeRemovals deletes, holds and hears.
        Layer.mergeAll(RepositoryCredentials, FakeHolds, RecordedLiveEvents)
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
