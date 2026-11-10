import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { MessageStorage } from "effect/cluster";

import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type {
  MetricsBatch,
  MetricsRequest,
} from "#analytics/application/metrics-reader.ts";
import {
  ChannelGateLive,
  GatedMetricsReader,
  UnreadComments,
} from "#publishing/infrastructure/channel-gate.ts";
import { FakePlatformPublisher } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { ChannelIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  readerAnswering,
  ReadLog,
  ReadLogTest,
} from "#test/analytics/read-log.ts";
import { countsOf } from "#test/analytics/support.ts";
import { clusterOver } from "#test/publishing/infrastructure/harness.ts";

// Reads through the channels' gates, on an in-memory cluster: the gate
// runs the platforms' readers, here a stand-in, one call at a time per
// channel with the channel's publishing.

const gatedOver = (
  answer: (request: MetricsRequest) => Effect.Effect<MetricsBatch>
) =>
  GatedMetricsReader.pipe(
    Layer.provideMerge(
      ChannelGateLive.pipe(
        Layer.provide(
          Layer.mergeAll(
            FakePlatformPublisher,
            readerAnswering(answer),
            UnreadComments
          )
        )
      )
    ),
    Layer.provideMerge(clusterOver(MessageStorage.layerMemory)),
    Layer.provideMerge(ReadLogTest)
  );

const request: MetricsRequest = {
  channelId: ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1"),
  posts: [
    {
      platformPostId: PlatformPostIdSchema.make("110000000000000001"),
      targetId: PostTargetIdSchema.make("01900000-0000-7000-8000-0000000000b1"),
    },
  ],
};

const counted: MetricsBatch = {
  halted: false,
  readings: [
    {
      _tag: "counted",
      metrics: countsOf(3, 1, 0),
      targetId: PostTargetIdSchema.make("01900000-0000-7000-8000-0000000000b1"),
    },
  ],
};

describe("reading through a channel's gate", () => {
  it.live("runs the platform's reader in the channel's gate", () =>
    Effect.gen(function* throughGate() {
      const batch = yield* MetricsReader.use((reader) => reader.read(request));

      assert.deepStrictEqual(batch, counted);
      assert.deepStrictEqual(yield* ReadLog.use((log) => log.requests), [
        request,
      ]);
    }).pipe(Effect.provide(gatedOver(() => Effect.succeed(counted))))
  );

  it.live("reads nothing when the reader breaks, and says so", () =>
    Effect.gen(function* broken() {
      const failure = yield* MetricsReader.use((reader) =>
        reader.read(request)
      ).pipe(Effect.flip);

      assert.instanceOf(failure, PlatformUnavailable);
    }).pipe(Effect.provide(gatedOver(() => Effect.die("a bug in a reader"))))
  );
});
