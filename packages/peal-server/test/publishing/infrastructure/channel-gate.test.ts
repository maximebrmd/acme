import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Deferred, Effect, Fiber, Layer } from "effect";
import { ClusterSchema, MessageStorage } from "effect/cluster";

import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import { CommentSource } from "#engagement/application/ports/comment-source.ts";
import { ReplySender } from "#engagement/application/ports/reply-sender.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import {
  ChannelGate,
  ChannelGateLive,
  GatedCommentSource,
  GatedMetricsReader,
  GatedPlatformPublisher,
  GatedReplySender,
} from "#publishing/infrastructure/channel-gate.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";

import { clusterOver, eventually, setTime, settle } from "./harness.ts";

// The channel's gate with every caller it has: publishing, analytics'
// reads of posts and of the account, engagement's reads of comments and
// its replies. Each context's calls are tested with their own adapters;
// here they meet on one channel, on the in-memory cluster.

const timeout = 60_000;
const start = "2026-11-10T10:00:00Z";

type Call =
  | "Publish"
  | "ReadAccount"
  | "ReadComments"
  | "ReadMetrics"
  | "SendReply";

/** What the adapters behind the gates were asked, and what holds them. */
interface Platform {
  /** Calls on these channels wait until `release` is done. */
  readonly held: Set<ChannelId>;
  readonly release: Deferred.Deferred<true>;
  running: number;
  /** The most calls any one channel ran at once. */
  together: number;
  readonly started: (readonly [ChannelId, Call])[];
}

// Runs a call as its adapter would: one more on its channel, held while
// the test says so.
const taking = <A, E>(
  platform: Platform,
  channelId: ChannelId,
  call: Call,
  answer: Effect.Effect<A, E>
) =>
  Effect.gen(function* handling() {
    platform.started.push([channelId, call]);
    platform.running += 1;
    platform.together = Math.max(platform.together, platform.running);

    if (platform.held.has(channelId)) {
      yield* Deferred.await(platform.release);
    }

    platform.running -= 1;

    return yield* answer;
  });

const adaptersOf = (platform: Platform) =>
  Layer.mergeAll(
    Layer.succeed(
      PlatformPublisher,
      PlatformPublisher.of({
        publish: ({ channelId }) =>
          taking(
            platform,
            channelId,
            "Publish",
            Effect.succeed({
              _tag: "published" as const,
              platformPostId: PlatformPostIdSchema.make("1001"),
            })
          ),
        resume: () => Effect.die("no call is resumed here"),
      })
    ),
    Layer.succeed(
      MetricsReader,
      MetricsReader.of({
        account: ({ channelId }) =>
          taking(
            platform,
            channelId,
            "ReadAccount",
            Effect.fail(new PlatformUnavailable())
          ),
        read: ({ channelId }) =>
          taking(
            platform,
            channelId,
            "ReadMetrics",
            Effect.succeed({ halted: false, readings: [] })
          ),
      })
    ),
    Layer.succeed(
      CommentSource,
      CommentSource.of({
        read: ({ channelId }) =>
          taking(
            platform,
            channelId,
            "ReadComments",
            Effect.succeed({ halted: false, readings: [] })
          ),
      })
    ),
    Layer.succeed(
      ReplySender,
      ReplySender.of({
        moderate: () => Effect.die("no comment is moderated here"),
        resume: () => Effect.die("no reply is resumed here"),
        send: ({ channelId }) =>
          taking(
            platform,
            channelId,
            "SendReply",
            Effect.succeed({
              _tag: "failed" as const,
              reason: "commentGone" as const,
            })
          ),
        withdraw: () => Effect.die("no reply is withdrawn here"),
      })
    )
  );

// One server: the gates on `platform`, and each context's way through them.
const serverOn = (platform: Platform) =>
  Layer.mergeAll(
    GatedPlatformPublisher,
    GatedMetricsReader,
    GatedCommentSource,
    GatedReplySender
  ).pipe(
    Layer.provideMerge(
      ChannelGateLive.pipe(Layer.provide(adaptersOf(platform)))
    ),
    Layer.provideMerge(clusterOver(MessageStorage.layerMemory))
  );

const makePlatform = Effect.gen(function* makePlatform() {
  const platform: Platform = {
    held: new Set(),
    release: yield* Deferred.make<true>(),
    running: 0,
    started: [],
    together: 0,
  };

  return platform;
});

const newChannel = newId(ChannelIdSchema).pipe(Effect.provide(IdsLive));

// Sends a call and lets it reach its gate before the next one is sent.
const sent = <A, E, R>(call: Effect.Effect<A, E, R>) =>
  Effect.gen(function* sending() {
    const calling = yield* Effect.forkChild(Effect.result(call), {
      startImmediately: true,
    });

    yield* settle(3);

    return calling;
  });

const publishOn = Effect.fn("test.publishOn")(function* publishOn(
  channelId: ChannelId
) {
  const ids = yield* Effect.all({
    postId: newId(PostIdSchema),
    targetId: newId(PostTargetIdSchema),
  }).pipe(Effect.provide(IdsLive));

  return yield* PlatformPublisher.use((platforms) =>
    platforms.publish({
      ...ids,
      channelId,
      idempotencyKey: `${ids.targetId}:1:0:1`,
      part: 0,
      startedAt: DateTime.makeUnsafe(start),
    })
  );
});

const workspaceId = WorkspaceIdSchema.make(
  "11111111-1111-4111-8111-111111111111"
);

const readMetricsOn = (channelId: ChannelId) =>
  MetricsReader.use((reader) => reader.read({ channelId, posts: [] }));

const readAccountOn = (channelId: ChannelId) =>
  MetricsReader.use((reader) => reader.account({ channelId, workspaceId }));

const readCommentsOn = (channelId: ChannelId) =>
  CommentSource.use((source) => source.read({ channelId, threads: [] }));

const replyOn = (channelId: ChannelId) =>
  ReplySender.use((sender) =>
    sender.send({
      channelId,
      replyId: ReplyIdSchema.make("00000000-0000-7000-8000-000000000001"),
    })
  );

describe("the channel's gate, with every context that calls through it", () => {
  it("keeps every call volatile", () => {
    const calls = [...ChannelGate.protocol.requests.values()];

    assert.deepStrictEqual(calls.map(({ _tag }) => _tag).toSorted(), [
      "ModerateComment",
      "Publish",
      "ReadAccount",
      "ReadComments",
      "ReadMetrics",
      "Resume",
      "ResumeReply",
      "SendReply",
      "WithdrawReply",
    ]);

    // A persisted call would store its payload in the cluster's tables:
    // none is, whichever context added it.
    assert.deepStrictEqual(
      calls.filter(({ annotations }) =>
        Context.get(annotations, ClusterSchema.Persisted)
      ),
      []
    );
  });

  it.effect(
    "runs one call at a time on a channel, in the order they came: a post waits for the read before it, never for those after",
    () =>
      setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* takesTurns() {
            const platform = yield* makePlatform;
            const channelId = yield* newChannel;

            platform.held.add(channelId);

            return yield* Effect.gen(function* checks() {
              // A read of post counts is in flight when a post comes due,
              // then the other collections and a reply reach the gate.
              const metrics = yield* sent(readMetricsOn(channelId));

              yield* eventually(
                "the read is in flight",
                Effect.sync(() => platform.started.length === 1)
              );

              const publish = yield* sent(publishOn(channelId));
              const comments = yield* sent(readCommentsOn(channelId));
              const account = yield* sent(readAccountOn(channelId));
              const reply = yield* sent(replyOn(channelId));

              // Nothing overtakes the call in flight.
              assert.deepStrictEqual(platform.started, [
                [channelId, "ReadMetrics"],
              ]);

              yield* Deferred.succeed(platform.release, true);

              const calls = [metrics, publish, comments, account, reply];

              yield* eventually(
                "every call ends",
                Effect.sync(() =>
                  calls.every((calling) => calling.pollUnsafe() !== undefined)
                )
              );

              assert.deepStrictEqual(
                platform.started.map(([, call]) => call),
                [
                  "ReadMetrics",
                  "Publish",
                  "ReadComments",
                  "ReadAccount",
                  "SendReply",
                ]
              );
              assert.strictEqual(platform.together, 1);

              // Each caller got its own answer back.
              assert.deepStrictEqual(
                (yield* Fiber.join(publish))._tag,
                "Success"
              );
              assert.deepStrictEqual(
                (yield* Fiber.join(account))._tag,
                "Failure"
              );

              const replied = yield* Fiber.join(reply);

              assert(replied._tag === "Success");
              assert.deepStrictEqual(replied.success, {
                _tag: "failed",
                reason: "commentGone",
              });

              // Nothing of any call was stored.
              const { journal } = yield* MessageStorage.MemoryDriver;

              assert.lengthOf(journal, 0);
            }).pipe(Effect.provide(serverOn(platform)));
          })
        )
      ),
    timeout
  );

  it.effect(
    "lets a channel publish while another channel's read is held up",
    () =>
      setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* channelsApart() {
            const platform = yield* makePlatform;
            const slow = yield* newChannel;
            const other = yield* newChannel;

            platform.held.add(slow);

            return yield* Effect.gen(function* checks() {
              const reading = yield* sent(readCommentsOn(slow));
              const publish = yield* sent(publishOn(other));

              yield* eventually(
                "the other channel's post is out",
                Effect.sync(() => publish.pollUnsafe() !== undefined)
              );

              assert.isUndefined(reading.pollUnsafe());
              assert.deepStrictEqual(
                (yield* Fiber.join(publish))._tag,
                "Success"
              );

              yield* Deferred.succeed(platform.release, true);
              yield* eventually(
                "the read ends",
                Effect.sync(() => reading.pollUnsafe() !== undefined)
              );
            }).pipe(Effect.provide(serverOn(platform)));
          })
        )
      ),
    timeout
  );
});
