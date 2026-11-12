import { assert, layer } from "@effect/vitest";
import {
  DateTime,
  Deferred,
  Duration,
  Effect,
  Fiber,
  Layer,
  Option,
} from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { EngagementStore } from "#engagement/application/ports/engagement-store.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import { markAnswered, receiveComment } from "#engagement/domain/comment.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import { writeReply } from "#engagement/domain/reply.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import { followPost, recordCollection } from "#engagement/domain/thread.ts";
import type { Thread } from "#engagement/domain/thread.ts";
import { DrizzleEngagementRecords } from "#engagement/infrastructure/drizzle-engagement-records.ts";
import { DrizzleEngagementStore } from "#engagement/infrastructure/drizzle-engagement-store.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { reading } from "#test/engagement/support.ts";

// The refresh bound on Postgres: a read stamps its thread, and the
// retention forgets the comments of a thread no read reached in time,
// under the thread's lock. Instants in 1923, which no other suite uses,
// and before the test clock's start: moving it forward past the pool's
// timers stalls the pool. Each test deletes its workspace's rows after.

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const day = Duration.hours(24);

// Transactions on the test's pool, as the server's runner opens them.
const SqlTransactions = Layer.effect(
  TransactionRunner,
  Effect.gen(function* SqlTransactions() {
    const sql = yield* SqlClient.SqlClient;

    return TransactionRunner.of({
      transaction: (effect) =>
        sql
          .withTransaction(effect)
          .pipe(
            Effect.catchTag("SqlError", (cause) =>
              Effect.fail(new DatabaseError({ cause }))
            )
          ),
    });
  })
);

const PurgeTest = PurgeEngagement.layer.pipe(
  Layer.provideMerge(
    Layer.merge(DrizzleEngagementStore, DrizzleEngagementRecords)
  ),
  Layer.provideMerge(SqlTransactions),
  Layer.provideMerge(DatabaseTest)
);

const forget = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM engagement.threads WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.orDie);

const threadOn = Effect.fn("threadOn")(function* threadOn(
  workspaceId: WorkspaceId,
  channelId: ChannelId,
  publishedAt: string
) {
  return followPost(yield* newId(ThreadIdSchema), {
    authorId: Option.none(),
    channelId,
    permalink: Option.none(),
    platformPostId: PlatformPostIdSchema.make("1001"),
    postId: yield* newId(PostIdSchema),
    publishedAt: utc(publishedAt),
    targetId: yield* newId(PostTargetIdSchema),
    workspaceId,
  });
});

const commentOn = Effect.fn("commentOn")(function* commentOn(
  thread: Thread,
  n: number
) {
  return receiveComment(
    yield* newId(CommentIdSchema),
    thread,
    reading(n, { writtenAt: thread.publishedAt }),
    thread.publishedAt
  );
});

// The thread as a read at `readAt` leaves it, on a platform bounding
// comments to `bound`.
const readAt = (
  thread: Thread,
  at: string,
  bound: Option.Option<Duration.Duration>
) => recordCollection(thread, utc(at), utc(at), Duration.days(30), bound, true);

const forgetAt = (at: string) =>
  TestClock.setTime(DateTime.toEpochMillis(utc(at))).pipe(
    Effect.andThen(PurgeEngagement.use((purging) => purging.forgetExpired))
  );

layer(PurgeTest)("the refresh bound on Postgres", (it) => {
  it.effect(
    "is stamped by a read, and forgets only past threads' comments, keeping their ids and the replies sent",
    () =>
      Effect.gen(function* forgets() {
        yield* TestClock.setTime(
          DateTime.toEpochMillis(utc("1923-02-01T09:00:00.000Z"))
        );

        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;
        const channelId = yield* newId(ChannelIdSchema);

        const bounded = yield* threadOn(
          workspaceId,
          channelId,
          "1923-02-01T10:00:00.000Z"
        );

        const unbounded = yield* threadOn(
          workspaceId,
          channelId,
          "1923-02-01T10:00:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([bounded, unbounded]);

          const first = yield* commentOn(bounded, 1);
          const second = yield* commentOn(bounded, 2);
          const other = yield* commentOn(unbounded, 3);

          yield* store.saveComments([first, second, other]);
          yield* store.saveCollections([
            readAt(bounded, "1923-02-01T10:10:00.000Z", Option.some(day)),
            readAt(unbounded, "1923-02-01T10:10:00.000Z", Option.none()),
          ]);

          assert.deepStrictEqual(
            Option.getOrUndefined(yield* store.thread(bounded.id))?.thread
              .refreshBy,
            Option.some(utc("1923-02-02T10:10:00.000Z"))
          );

          const reply = writeReply(
            yield* newId(ReplyIdSchema),
            first,
            Option.none(),
            "Thank you, synthetic reader!",
            utc("1923-02-01T10:15:00.000Z")
          );

          yield* store.journalReply(reply, Option.none());

          assert.strictEqual(yield* forgetAt("1923-02-02T10:09:59.999Z"), 0);
          assert.strictEqual(yield* forgetAt("1923-02-02T10:10:00.000Z"), 1);

          const kept = yield* store.commentsOf(bounded.id);

          assert.deepStrictEqual(
            kept.map(
              ({ author, expiredAt, platformCommentId, state, text }) => ({
                author: Option.isSome(author),
                expiredAt,
                platformCommentId,
                state,
                text,
              })
            ),
            [
              {
                author: false,
                expiredAt: Option.some(utc("1923-02-02T10:10:00.000Z")),
                platformCommentId: first.platformCommentId,
                state: "deleted",
                text: "",
              },
              {
                author: false,
                expiredAt: Option.some(utc("1923-02-02T10:10:00.000Z")),
                platformCommentId: second.platformCommentId,
                state: "deleted",
                text: "",
              },
            ]
          );

          const summary = Option.getOrUndefined(
            yield* store.thread(bounded.id)
          );

          assert.deepStrictEqual(summary?.thread.refreshBy, Option.none());
          assert.strictEqual(summary?.comments, 0);
          assert.strictEqual(
            Option.getOrUndefined(yield* store.reply(reply.id))?.text,
            "Thank you, synthetic reader!"
          );

          // The thread of a platform that bounds nothing is untouched.
          assert.deepStrictEqual(
            (yield* store.commentsOf(unbounded.id)).map(({ state, text }) => ({
              state,
              text,
            })),
            [{ state: "new", text: "Comment 3" }]
          );

          // Nothing left to forget.
          assert.strictEqual(yield* forgetAt("1923-02-03T10:10:00.000Z"), 0);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      }),
    { timeout: 20_000 }
  );

  it.effect(
    "waits for a writer holding the thread, and forgets nothing a read moved meanwhile",
    () =>
      Effect.gen(function* waits() {
        yield* TestClock.setTime(
          DateTime.toEpochMillis(utc("1923-03-01T09:00:00.000Z"))
        );

        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;
        const sql = yield* SqlClient.SqlClient;
        const channelId = yield* newId(ChannelIdSchema);

        const thread = yield* threadOn(
          workspaceId,
          channelId,
          "1923-03-01T10:00:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const kept = yield* commentOn(thread, 1);

          yield* store.saveComments([kept]);
          yield* store.saveCollections([
            readAt(thread, "1923-03-01T10:10:00.000Z", Option.some(day)),
          ]);

          const held = yield* Deferred.make<true>();
          const release = yield* Deferred.make<true>();

          // A read holds the thread past its bound: it finds the comment
          // again, answers it, and moves the bound.
          const rereading = yield* sql
            .withTransaction(
              Effect.gen(function* reconciling() {
                yield* store.lockThread(thread.id);
                yield* Deferred.succeed(held, true);
                yield* Deferred.await(release);
                yield* store.saveComments([
                  markAnswered(kept, utc("1923-03-02T10:20:00.000Z")),
                ]);
                yield* store.saveCollections([
                  readAt(thread, "1923-03-02T10:20:00.000Z", Option.some(day)),
                ]);
              })
            )
            .pipe(Effect.forkChild);

          yield* Deferred.await(held);

          const forgetting = yield* forgetAt("1923-03-02T10:30:00.000Z").pipe(
            Effect.forkChild
          );

          // Real time, for the retention's transaction to reach the lock.
          yield* TestClock.withLive(Effect.sleep("200 millis"));
          yield* Deferred.succeed(release, true);
          yield* Fiber.join(rereading);

          assert.strictEqual(yield* Fiber.join(forgetting), 0);
          assert.deepStrictEqual(
            (yield* store.commentsOf(thread.id)).map(({ state, text }) => ({
              state,
              text,
            })),
            [{ state: "answered", text: "Comment 1" }]
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      }),
    { timeout: 20_000 }
  );

  it.effect(
    "forgets at once what a disconnected channel of a bounding platform holds, its threads not read yet included, and nothing else",
    () =>
      Effect.gen(function* disconnected() {
        yield* TestClock.setTime(
          DateTime.toEpochMillis(utc("1923-04-01T09:00:00.000Z"))
        );

        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;
        const records = yield* EngagementRecords;
        const channelId = yield* newId(ChannelIdSchema);
        const otherChannel = yield* newId(ChannelIdSchema);

        const bounded = yield* threadOn(
          workspaceId,
          channelId,
          "1923-04-01T10:00:00.000Z"
        );

        const unread = yield* threadOn(
          workspaceId,
          channelId,
          "1923-04-01T10:00:00.000Z"
        );

        const elsewhere = yield* threadOn(
          workspaceId,
          otherChannel,
          "1923-04-01T10:00:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([bounded, unread, elsewhere]);

          const first = yield* commentOn(bounded, 1);

          yield* store.saveComments([
            first,
            yield* commentOn(unread, 2),
            yield* commentOn(elsewhere, 3),
          ]);
          yield* store.saveCollections([
            readAt(bounded, "1923-04-01T10:10:00.000Z", Option.some(day)),
            readAt(elsewhere, "1923-04-01T10:10:00.000Z", Option.none()),
          ]);

          const reply = writeReply(
            yield* newId(ReplyIdSchema),
            first,
            Option.none(),
            "Thank you, synthetic reader!",
            utc("1923-04-01T10:15:00.000Z")
          );

          yield* store.journalReply(reply, Option.none());
          yield* records.channelGone(
            channelId,
            "youtube",
            utc("1923-04-01T11:00:00.000Z")
          );
          // A platform that bounds nothing keeps its threads as they are.
          yield* records.channelGone(
            otherChannel,
            "mastodon",
            utc("1923-04-01T11:00:00.000Z")
          );

          const forgotten = yield* store.commentsOf(bounded.id);

          assert.deepStrictEqual(
            forgotten.map(({ author, expiredAt, state, text }) => ({
              author: Option.isSome(author),
              expiredAt,
              state,
              text,
            })),
            [
              {
                author: false,
                expiredAt: Option.some(utc("1923-04-01T11:00:00.000Z")),
                state: "deleted",
                text: "",
              },
            ]
          );
          const after = Option.getOrUndefined(yield* store.thread(bounded.id));

          assert.strictEqual(after?.comments, 0);
          // Ended at once, so a read on its way keeps nothing it found.
          assert.deepStrictEqual(after?.thread.collection, {
            _tag: "ended",
            at: utc("1923-04-01T11:00:00.000Z"),
            reason: "disconnected",
          });
          assert.deepStrictEqual(after?.thread.refreshBy, Option.none());
          assert.strictEqual(
            Option.getOrUndefined(yield* store.reply(reply.id))?.text,
            "Thank you, synthetic reader!"
          );

          // A thread not read yet, whose first read may be on its way,
          // ends too, with nothing kept.
          const notRead = Option.getOrUndefined(yield* store.thread(unread.id));

          assert.deepStrictEqual(notRead?.thread.collection, {
            _tag: "ended",
            at: utc("1923-04-01T11:00:00.000Z"),
            reason: "disconnected",
          });
          assert.deepStrictEqual(
            (yield* store.commentsOf(unread.id)).map(({ state }) => state),
            ["deleted"]
          );

          // Another channel's, on a platform that bounds nothing, keeps
          // its comments for their retention, and is read on.
          const other = Option.getOrUndefined(
            yield* store.thread(elsewhere.id)
          );

          assert.strictEqual(other?.thread.collection._tag, "collecting");
          assert.deepStrictEqual(
            (yield* store.commentsOf(elsewhere.id)).map(({ state }) => state),
            ["new"]
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      }),
    { timeout: 20_000 }
  );
});
