import { assert, describe, it } from "@effect/vitest";
import {
  Context,
  DateTime,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Scope,
} from "effect";
import { MessageStorage } from "effect/cluster";
import { TestClock } from "effect/testing";

import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import { CommentSource } from "#engagement/application/ports/comment-source.ts";
import type { CommentsRequest } from "#engagement/application/ports/comment-source.ts";
import { EngagementStore } from "#engagement/application/ports/engagement-store.ts";
import { ReplyJobs } from "#engagement/application/ports/reply-jobs.ts";
import { ReplySender } from "#engagement/application/ports/reply-sender.ts";
import type {
  ActionOutcome,
  ModerationRequest,
  SendOutcome,
  SendRequest,
} from "#engagement/application/ports/reply-sender.ts";
import { SendReply } from "#engagement/application/send-reply.ts";
import type { ReplyId } from "#engagement/domain/reply-id.ts";
import { WorkflowReplyJobs } from "#engagement/infrastructure/workflow-reply-jobs.ts";
import {
  SendReplyV1,
  SendReplyV1Live,
} from "#engagement/infrastructure/workflows/send-reply.ts";
import { LivePostClients } from "#publishing/application/live-post-clients.ts";
import {
  ChannelGateLive,
  GatedCommentSource,
  GatedReplySender,
  UnreadMessages,
  UnreadReviews,
  UnreadMetrics,
} from "#publishing/infrastructure/channel-gate.ts";
import { FakePlatformPublisher } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Actor } from "#shared/domain/access.ts";
import { makeWorld } from "#test/engagement/fakes/world.ts";
import type { World } from "#test/engagement/fakes/world.ts";
import {
  channelId,
  comment,
  commentId,
  memberId,
  reading,
  thread,
  threadId,
  workspaceId,
} from "#test/engagement/support.ts";
import {
  clusterOver,
  eventually,
  setTime,
  settle,
  shutDown,
} from "#test/publishing/infrastructure/harness.ts";

// SendReplyV1 and the gate's engagement calls on the in-memory cluster the
// publishing workflows are tested on: the job a reply's journal row starts,
// the channel's gate between it and the platform, and a restart in the
// middle of a call. The store is the engagement tests' world, which
// outlives a server; the platform is scripted here.

const timeout = 60_000;
const start = "2026-11-10T10:00:00Z";
const text = "Thank you, synthetic reader!";

const editor = new Actor({
  permissions: ["engagement:read", "engagement:reply"],
  subject: { _tag: "user", impersonatedBy: Option.none(), userId: memberId },
  workspaceId,
});

const went: SendOutcome = {
  _tag: "sent",
  permalink: Option.some("https://social.example/@studio/3001"),
  platformCommentId: "3001",
};

/** The platform behind the gate: what it was asked, and how it answers. */
interface Platform {
  /** What a like or a hide waits for, holding the channel's gate. */
  moderate: Effect.Effect<void>;
  readonly moderated: ModerationRequest[];
  readonly read: CommentsRequest[];
  resume: (request: SendRequest) => Effect.Effect<SendOutcome>;
  readonly resumed: SendRequest[];
  send: (request: SendRequest) => Effect.Effect<SendOutcome>;
  readonly sent: SendRequest[];
  readonly withdrawn: SendRequest[];
}

const makePlatform = (): Platform => ({
  moderate: Effect.void,
  moderated: [],
  read: [],
  resume: () => Effect.succeed({ _tag: "unconfirmed", reason: "interrupted" }),
  resumed: [],
  send: () => Effect.succeed(went),
  sent: [],
  withdrawn: [],
});

const done: ActionOutcome = { _tag: "done" };

// What the gate's handlers call: the platform's adapters, scripted. As
// the real ones, they claim a reply's call before making it, and make
// none for a reply that is no longer on its way.
const adaptersOf = (world: World, platform: Platform) => {
  const claimed = (
    request: SendRequest,
    call: () => Effect.Effect<SendOutcome>
  ) =>
    EngagementStore.use((store) =>
      DateTime.now.pipe(
        Effect.flatMap((now) => store.claimCall(request.replyId, now))
      )
    ).pipe(
      Effect.provide(world.ports),
      Effect.orDie,
      Effect.flatMap((mine): Effect.Effect<SendOutcome> =>
        mine
          ? call()
          : Effect.succeed({ _tag: "unconfirmed", reason: "interrupted" })
      )
    );

  return Layer.mergeAll(
    UnreadReviews,
    UnreadMessages,
    Layer.succeed(
      CommentSource,
      CommentSource.of({
        read: (request) =>
          Effect.sync(() => {
            platform.read.push(request);

            return {
              halted: false,
              readings: request.threads.map(({ threadId: id }) => ({
                _tag: "read" as const,
                comments: [reading(1)],
                complete: true,
                threadId: id,
              })),
            };
          }),
      })
    ),
    Layer.succeed(
      ReplySender,
      ReplySender.of({
        moderate: (request) =>
          Effect.suspend(() => {
            platform.moderated.push(request);

            return platform.moderate.pipe(Effect.as(done));
          }),
        resume: (request) =>
          claimed(request, () => {
            platform.resumed.push(request);

            return platform.resume(request);
          }),
        send: (request) =>
          claimed(request, () => {
            platform.sent.push(request);

            return platform.send(request);
          }),
        withdraw: (request) =>
          Effect.sync(() => {
            platform.withdrawn.push(request);

            return done;
          }),
      })
    )
  );
};

/**
 * One server: the reply use cases of `world` with their job started as a
 * workflow and every platform call sent through the channel's gate, which
 * runs `platform`, on a fresh Sharding over `storage`.
 */
const serverOver = <S, E, R>(
  world: World,
  platform: Platform,
  storage: Layer.Layer<S, E, R>,
  store?: Layer.Layer<EngagementStore>
) =>
  SendReplyV1Live.pipe(
    Layer.provideMerge(
      Layer.mergeAll(EngagementReplies.layer, SendReply.layer).pipe(
        // The adapters under test first, then a store a test stands in;
        // the world's ports for the rest.
        Layer.provideMerge(
          Layer.mergeAll(
            GatedReplySender,
            GatedCommentSource,
            WorkflowReplyJobs
          )
        ),
        Layer.provide(store ?? Layer.empty),
        Layer.provide(world.ports)
      )
    ),
    Layer.provideMerge(
      ChannelGateLive.pipe(
        Layer.provide(
          Layer.mergeAll(
            FakePlatformPublisher,
            UnreadMetrics,
            adaptersOf(world, platform),
            LivePostClients.none
          )
        )
      )
    ),
    Layer.provideMerge(clusterOver(storage))
  );

// The world's store, whose reads of a reply fail while `failing` says so:
// the database down under the job.
const storeFailing = (world: World, failing: () => boolean) =>
  Layer.effect(
    EngagementStore,
    EngagementStore.use((store) =>
      Effect.succeed(
        EngagementStore.of({
          ...store,
          reply: (id) =>
            failing()
              ? Effect.fail(new DatabaseError({ cause: "synthetic outage" }))
              : store.reply(id),
        })
      )
    )
  ).pipe(Layer.provide(world.ports));

// A world with one thread on a Mastodon channel and one comment under it.
const worldWithComment = (): World => {
  const world = makeWorld();
  const post = thread(50);
  const kept = comment(101, {}, post);

  world.state.threads.set(post.id, post);
  world.state.channels.set(channelId(1), {
    connection: Option.none(),
    platform: "mastodon",
    scopes: ["read:statuses", "write:statuses"],
  });
  world.state.comments.set(kept.id, kept);

  return world;
};

const replying = EngagementReplies.use((replies) =>
  replies.reply(editor, commentId(101), text)
);

const statusOf = (world: World, id: ReplyId) =>
  world.state.replies.get(id)?.status._tag;

// A call made directly waits on the cluster, which virtual time drives.
const answered = <A, E, R>(call: Effect.Effect<A, E, R>) =>
  Effect.gen(function* awaitingTheGate() {
    const calling = yield* Effect.forkChild(call, { startImmediately: true });

    yield* eventually(
      "the gate answers",
      Effect.sync(() => calling.pollUnsafe() !== undefined)
    );

    return yield* Fiber.join(calling);
  });

const jobEnded = (id: ReplyId) =>
  Effect.gen(function* pollingJob() {
    const executionId = yield* SendReplyV1.executionId({ replyId: id });
    const result = yield* SendReplyV1.poll(executionId);

    return Option.isSome(result) && result.value._tag === "Complete";
  });

describe("SendReplyV1 on a cluster", () => {
  it.effect(
    "sends a journalled reply once through its channel's gate, and keeps its text out of the cluster",
    () => {
      const world = worldWithComment();
      const platform = makePlatform();

      return setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* sendsOnce() {
            const reply = yield* replying;

            yield* eventually("the reply's job ends", jobEnded(reply.id));

            assert.strictEqual(statusOf(world, reply.id), "sent");
            assert.deepStrictEqual(platform.sent, [
              { channelId: channelId(1), replyId: reply.id },
            ]);
            assert.lengthOf(platform.resumed, 0);
            assert.strictEqual(
              world.state.comments.get(commentId(101))?.state,
              "answered"
            );
            assert.deepStrictEqual(
              world.state.replied.map(({ id }) => id),
              [reply.id]
            );

            // Starting its job again is the same execution, and a run
            // that finds the reply settled does nothing more.
            yield* ReplyJobs.use((jobs) => jobs.start(reply.id));
            yield* SendReply.use((sending) => sending.run(reply.id));
            yield* settle(10);

            assert.lengthOf(platform.sent, 1);

            // The gate's calls are volatile, and the job's payload is an
            // id: no stored message is addressed to a gate, and none holds
            // what the member wrote.
            const { journal } = yield* MessageStorage.MemoryDriver;
            const stored = JSON.stringify(journal);

            assert.isAbove(journal.length, 0);
            assert.isFalse(
              journal.some(
                ({ address }) => address.entityType === "ChannelGate"
              )
            );
            assert.notInclude(stored, text);
            assert.notInclude(stored, "Comment 101");
          }).pipe(
            Effect.provide(
              serverOver(world, platform, MessageStorage.layerMemory)
            )
          )
        )
      );
    },
    timeout
  );

  it.effect(
    "never sends again a reply whose outcome is unknown",
    () => {
      const world = worldWithComment();
      const platform = makePlatform();

      platform.send = () =>
        Effect.succeed({ _tag: "unconfirmed", reason: "noResponse" });

      return setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* leavesItUnconfirmed() {
            const reply = yield* replying;

            yield* eventually("the reply's job ends", jobEnded(reply.id));

            assert.strictEqual(statusOf(world, reply.id), "unconfirmed");

            // Hours pass, and the job is asked for again: a person settles
            // an unconfirmed reply, never a retry.
            yield* setTime("2026-11-10T16:00:00Z");
            yield* settle(20);
            yield* ReplyJobs.use((jobs) => jobs.start(reply.id));
            yield* SendReply.use((sending) => sending.run(reply.id));
            yield* settle(20);

            assert.lengthOf(platform.sent, 1);
            assert.lengthOf(platform.resumed, 0);
            assert.strictEqual(statusOf(world, reply.id), "unconfirmed");
            // It may be out: the comment counts as answered until then.
            assert.strictEqual(
              world.state.comments.get(commentId(101))?.state,
              "answered"
            );
          }).pipe(
            Effect.provide(
              serverOver(world, platform, MessageStorage.layerMemory)
            )
          )
        )
      );
    },
    timeout
  );

  it.effect(
    "calls a reply unconfirmed when its adapter breaks during the call",
    () => {
      const world = worldWithComment();
      const platform = makePlatform();

      platform.send = () => Effect.die(new Error("synthetic adapter bug"));

      return setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* survivesTheBug() {
            const reply = yield* replying;

            yield* eventually("the reply's job ends", jobEnded(reply.id));

            assert.deepStrictEqual(world.state.replies.get(reply.id)?.status, {
              _tag: "unconfirmed",
              at: DateTime.makeUnsafe(start),
              reason: "adapterFailure",
            });
            assert.lengthOf(platform.sent, 1);

            // The gate still answers: a bug fails its own call only.
            const outcome = yield* answered(
              ReplySender.use((sender) =>
                sender.withdraw({ channelId: channelId(1), replyId: reply.id })
              )
            );

            assert.deepStrictEqual(outcome, done);
          }).pipe(
            Effect.provide(
              serverOver(world, platform, MessageStorage.layerMemory)
            )
          )
        )
      );
    },
    timeout
  );

  it.effect(
    "looks up a reply a restart cut short, instead of sending it again",
    () =>
      Effect.gen(function* resumesAfterRestart() {
        yield* setTime(start);

        const world = worldWithComment();
        const platform = makePlatform();
        const storage = yield* Layer.build(MessageStorage.MemoryDriver.layer);
        const driver = Context.get(storage, MessageStorage.MemoryDriver);

        const server = serverOver(
          world,
          platform,
          Layer.succeed(MessageStorage.MessageStorage, driver.storage)
        );

        // The reply leaves, and its answer never comes back.
        platform.send = () => Effect.never;
        platform.resume = () => Effect.succeed(went);

        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(server, before);
        const reply = yield* replying.pipe(Effect.provideContext(first));

        yield* eventually(
          "the call is in flight",
          Effect.sync(() => platform.sent.length === 1)
        ).pipe(Effect.provideContext(first));

        // The journal says the call set out, before any answer.
        const journalled = world.state.replies.get(reply.id)?.status;

        assert(journalled?._tag === "sending");
        assert.isTrue(Option.isSome(journalled.attemptedAt));

        yield* shutDown(before);

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the reply's job ends", jobEnded(reply.id)).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(platform.sent, 1);
        assert.deepStrictEqual(platform.resumed, [
          { channelId: channelId(1), replyId: reply.id },
        ]);
        assert.strictEqual(statusOf(world, reply.id), "sent");
        assert.lengthOf(world.state.replied, 1);

        yield* shutDown(after);
      }),
    timeout
  );

  it.effect(
    "leaves a reply unconfirmed when the platform cannot say after a restart",
    () =>
      Effect.gen(function* cannotTell() {
        yield* setTime(start);

        const world = worldWithComment();
        const platform = makePlatform();
        const storage = yield* Layer.build(MessageStorage.MemoryDriver.layer);
        const driver = Context.get(storage, MessageStorage.MemoryDriver);

        const server = serverOver(
          world,
          platform,
          Layer.succeed(MessageStorage.MessageStorage, driver.storage)
        );

        platform.send = () => Effect.never;

        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(server, before);
        const reply = yield* replying.pipe(Effect.provideContext(first));

        yield* eventually(
          "the call is in flight",
          Effect.sync(() => platform.sent.length === 1)
        ).pipe(Effect.provideContext(first));
        yield* shutDown(before);

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the reply's job ends", jobEnded(reply.id)).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(platform.sent, 1);
        assert.lengthOf(platform.resumed, 1);
        assert.strictEqual(statusOf(world, reply.id), "unconfirmed");

        yield* shutDown(after);
      }),
    timeout
  );
});

describe("a reply handed over as stranded", () => {
  it.effect(
    "is never sent once handed over, however late its turn at the gate comes",
    () => {
      const world = worldWithComment();
      const platform = makePlatform();

      return setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* handsOver() {
            // Another call holds the channel's gate, as a long upload does.
            const release = yield* Deferred.make<true>();

            platform.moderate = Deferred.await(release).pipe(Effect.asVoid);

            const sender = yield* ReplySender;

            const holding = yield* Effect.forkChild(
              sender.moderate({
                action: "like",
                channelId: channelId(1),
                commentId: commentId(101),
              }),
              { startImmediately: true }
            );

            yield* eventually(
              "the gate is held",
              Effect.sync(() => platform.moderated.length === 1)
            );

            const reply = yield* replying;

            yield* TestClock.adjust("61 minutes");
            yield* settle(5);

            assert.lengthOf(platform.sent, 0);

            const handed = yield* SendReply.use(
              (sending) => sending.settleStranded
            );

            assert.strictEqual(handed, 1);
            assert.strictEqual(statusOf(world, reply.id), "unconfirmed");

            // A member finds nothing on the platform: that is final.
            yield* EngagementReplies.use((replies) =>
              replies.confirm(editor, reply.id, false)
            );

            // The gate is free at last, and the reply's turn comes.
            yield* Deferred.succeed(release, true);
            yield* eventually(
              "the held call ends",
              Effect.sync(() => holding.pollUnsafe() !== undefined)
            );
            yield* eventually("the reply's job ends", jobEnded(reply.id));
            yield* ReplyJobs.use((jobs) => jobs.start(reply.id));
            yield* TestClock.adjust("2 hours");
            yield* settle(10);

            assert.strictEqual(statusOf(world, reply.id), "failed");
            assert.lengthOf(platform.sent, 0);
            assert.lengthOf(platform.resumed, 0);
          }).pipe(
            Effect.provide(
              serverOver(world, platform, MessageStorage.layerMemory)
            )
          )
        )
      );
    },
    timeout
  );
});

describe("SendReplyV1 while the database is down", () => {
  it.effect(
    "sends the reply once the database answers again",
    () => {
      const world = worldWithComment();
      const platform = makePlatform();
      let outages = 2;

      const store = storeFailing(world, () => {
        outages -= 1;

        return outages >= 0;
      });

      return setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* recovers() {
            const reply = yield* replying;

            yield* eventually("the reply's job ends", jobEnded(reply.id));

            assert.strictEqual(statusOf(world, reply.id), "sent");
            assert.lengthOf(platform.sent, 1);
          }).pipe(
            Effect.provide(
              serverOver(world, platform, MessageStorage.layerMemory, store)
            )
          )
        )
      );
    },
    timeout
  );

  it.effect(
    "gives up after its retries without sending, and leaves the reply on its way for someone to settle",
    () => {
      const world = worldWithComment();
      const platform = makePlatform();
      const store = storeFailing(world, () => true);

      return setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* givesUp() {
            const reply = yield* replying;

            const executionId = yield* SendReplyV1.executionId({
              replyId: reply.id,
            });

            // The retries span about two minutes of virtual time.
            for (let round = 0; round < 60; round += 1) {
              if (yield* jobEnded(reply.id)) {
                break;
              }

              yield* TestClock.adjust("5 seconds");
              yield* settle(2);
            }

            const result = yield* SendReplyV1.poll(executionId);

            // The job ends rather than run for ever: its error is logged.
            assert(Option.isSome(result) && result.value._tag === "Complete");
            assert.isTrue(Exit.isSuccess(result.value.exit));

            // Nothing was sent, and nothing says it was.
            assert.lengthOf(platform.sent, 0);
            assert.lengthOf(platform.resumed, 0);
            assert.strictEqual(statusOf(world, reply.id), "sending");
            assert.lengthOf(world.state.replied, 0);
          }).pipe(
            Effect.provide(
              serverOver(world, platform, MessageStorage.layerMemory, store)
            )
          )
        )
      );
    },
    timeout
  );
});

describe("the gate's engagement calls", () => {
  it.effect(
    "reads comments and acts on them through the channel's gate, by id",
    () => {
      const world = worldWithComment();
      const platform = makePlatform();

      return setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* callsTheGate() {
            const batch = yield* answered(
              CommentSource.use((source) =>
                source.read({
                  channelId: channelId(1),
                  threads: [
                    {
                      platformPostId: thread(50).platformPostId,
                      threadId: threadId(50),
                    },
                  ],
                })
              )
            );

            assert.isFalse(batch.halted);
            assert.deepStrictEqual(
              batch.readings.map((found) => found._tag),
              ["read"]
            );
            assert.lengthOf(platform.read, 1);

            const sender = yield* ReplySender;

            const liked = yield* answered(
              sender.moderate({
                action: "like",
                channelId: channelId(1),
                commentId: commentId(101),
              })
            );

            assert.deepStrictEqual(liked, done);
            assert.deepStrictEqual(
              platform.moderated.map(({ action }) => action),
              ["like"]
            );

            // Reads and actions are volatile too: nothing was stored.
            const { journal } = yield* MessageStorage.MemoryDriver;

            assert.lengthOf(journal, 0);
          }).pipe(
            Effect.provide(
              serverOver(world, platform, MessageStorage.layerMemory)
            )
          )
        )
      );
    },
    timeout
  );
});
