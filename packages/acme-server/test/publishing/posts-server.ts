import { Effect, Layer } from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { publishingWith, publishingWorkers } from "#publishing/container.ts";
import { FakePlatformPublisher } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { ListedWorkspaceChannels } from "#publishing/infrastructure/listed-workspace-channels.ts";
import type { MediaAssetId, WorkspaceId } from "#shared/domain/ids.ts";
import { MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { freshChannel, syntheticCredentials } from "#test/channels/support.ts";
import {
  clusterOver,
  DatabaseTest,
  setTime,
} from "#test/publishing/infrastructure/harness.ts";
import { attachableMedia } from "#test/publishing/support.ts";

// The publishing use cases as the server runs them, on an in-memory cluster
// driven by TestClock: posts go to the channels the channels context lists
// from Postgres, through the real adapter, and a fake platform publishes
// them. Ids are random, so tests never meet each other's rows.

/** The one media asset posts may show here. */
export const attachableImage: MediaAssetId = MediaAssetIdSchema.make(
  "00000000-0000-7000-8000-00000000a001"
);

export const PostsServerTest = publishingWorkers(FakePlatformPublisher).pipe(
  Layer.provideMerge(
    publishingWith(
      Layer.mergeAll(
        ListedWorkspaceChannels,
        attachableMedia([attachableImage])
      )
    )
  ),
  Layer.provideMerge(ListChannels.layer),
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
  Layer.provideMerge(clusterOver(MessageStorage.layerMemory)),
  Layer.provideMerge(FakePlatformPublisher),
  Layer.provideMerge(DatabaseTest)
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
