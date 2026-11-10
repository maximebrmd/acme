import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Result } from "effect";
import { SqlClient } from "effect/sql";

import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { EngagementStore } from "#engagement/application/ports/engagement-store.ts";
import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import {
  forgetComment,
  markAnswered,
  receiveComment,
} from "#engagement/domain/comment.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import {
  beginSending,
  settleReply,
  writeReply,
} from "#engagement/domain/reply.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import {
  endCollection,
  followPost,
  recordCollection,
} from "#engagement/domain/thread.ts";
import type { Thread } from "#engagement/domain/thread.ts";
import { DrizzleEngagementRecords } from "#engagement/infrastructure/drizzle-engagement-records.ts";
import { DrizzleEngagementStore } from "#engagement/infrastructure/drizzle-engagement-store.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  UserIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { reading } from "#test/engagement/support.ts";

// The Postgres store, on the database DATABASE_URL names. Each test writes
// rows of its own workspace, at instants no other suite uses, and deletes
// them after.

const StoreTest = Layer.mergeAll(
  DrizzleEngagementStore,
  DrizzleEngagementRecords
).pipe(Layer.provideMerge(DatabaseTest));

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const forget = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.all([
      sql`DELETE FROM engagement.threads WHERE workspace_id = ${workspaceId}`,
      sql`DELETE FROM engagement.erased_workspaces WHERE workspace_id = ${workspaceId}`,
    ])
  ).pipe(Effect.orDie);

const threadOn = Effect.fn("threadOn")(function* threadOn(
  workspaceId: WorkspaceId,
  channelId: ChannelId,
  publishedAt: string
) {
  return followPost(yield* newId(ThreadIdSchema), {
    channelId,
    permalink: Option.some("https://social.example/@studio/1"),
    platformPostId: PlatformPostIdSchema.make("1001"),
    postId: yield* newId(PostIdSchema),
    publishedAt: utc(publishedAt),
    targetId: yield* newId(PostTargetIdSchema),
    workspaceId,
  });
});

const commentOn = Effect.fn("commentOn")(function* commentOn(
  thread: Thread,
  n: number,
  writtenAt: string
) {
  return receiveComment(
    yield* newId(CommentIdSchema),
    thread,
    reading(n, { writtenAt: utc(writtenAt) }),
    utc(writtenAt)
  );
});

layer(StoreTest)("the engagement store", (it) => {
  it.effect("follows a post once, and reads it when due", () =>
    Effect.gen(function* follows() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* EngagementStore;
      const channelId = yield* newId(ChannelIdSchema);

      const thread = yield* threadOn(
        workspaceId,
        channelId,
        "2043-03-02T10:20:00.000Z"
      );

      yield* Effect.gen(function* checks() {
        assert.strictEqual(yield* store.follow([thread]), 1);
        assert.strictEqual(yield* store.follow([thread]), 0);

        const at = utc("2043-03-02T10:30:00.000Z");

        assert.deepStrictEqual(yield* store.dueOn(at, [channelId], 10), [
          thread,
        ]);

        const channels = yield* store.dueChannels(at, 500, Option.none());

        assert.deepStrictEqual(
          channels.filter((due) => due.channelId === channelId),
          [{ channelId, dueSince: thread.publishedAt }]
        );

        const read = recordCollection(
          thread,
          utc("2043-03-02T10:30:01.500Z"),
          at,
          Duration.days(30)
        );

        yield* store.saveCollections([read]);

        assert.deepStrictEqual(yield* store.dueOn(at, [channelId], 10), []);
        assert.deepStrictEqual(
          yield* store.dueOn(utc("2043-03-02T10:40:00.000Z"), [channelId], 10),
          [read]
        );
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect("keeps a comment once, with its thread's counts", () =>
    Effect.gen(function* keeps() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* EngagementStore;

      const thread = yield* threadOn(
        workspaceId,
        yield* newId(ChannelIdSchema),
        "2043-03-03T10:20:00.000Z"
      );

      yield* Effect.gen(function* checks() {
        yield* store.follow([thread]);

        const first = yield* commentOn(thread, 1, "2043-03-03T10:25:00.000Z");
        const second = yield* commentOn(thread, 2, "2043-03-03T10:26:00.000Z");

        yield* store.saveComments([first, second]);

        assert.deepStrictEqual(yield* store.commentsOf(thread.id), [
          first,
          second,
        ]);

        const answered = markAnswered(first, utc("2043-03-03T11:00:00.000Z"));
        const gone = forgetComment(second);

        yield* store.saveComments([answered, gone]);

        assert.deepStrictEqual(
          yield* store.comment(first.id),
          Option.some(answered)
        );
        assert.deepStrictEqual(
          yield* store.comment(second.id),
          Option.some(gone)
        );

        const summary = yield* store.thread(thread.id);

        assert.deepStrictEqual(
          summary.pipe(
            Option.map(({ comments, lastCommentAt, unanswered }) => ({
              comments,
              lastCommentAt,
              unanswered,
            }))
          ),
          Option.some({
            comments: 1,
            lastCommentAt: Option.some(first.writtenAt),
            unanswered: 0,
          })
        );
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect(
    "lists a workspace's threads with comments, those waiting first, page by page",
    () =>
      Effect.gen(function* lists() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;
        const channelId = yield* newId(ChannelIdSchema);
        const other = yield* newId(ChannelIdSchema);

        const quiet = yield* threadOn(
          workspaceId,
          channelId,
          "2043-03-04T08:00:00.000Z"
        );

        const answered = yield* threadOn(
          workspaceId,
          channelId,
          "2043-03-04T09:00:00.000Z"
        );

        const old = yield* threadOn(
          workspaceId,
          other,
          "2043-03-04T10:00:00.000Z"
        );

        const recent = yield* threadOn(
          workspaceId,
          channelId,
          "2043-03-04T11:00:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([quiet, answered, old, recent]);

          yield* store.saveComments([
            markAnswered(
              yield* commentOn(answered, 1, "2043-03-04T15:00:00.000Z"),
              utc("2043-03-04T15:30:00.000Z")
            ),
            yield* commentOn(old, 2, "2043-03-04T12:00:00.000Z"),
            yield* commentOn(recent, 3, "2043-03-04T13:00:00.000Z"),
          ]);

          const all = {
            channelId: Option.none(),
            postId: Option.none(),
            unanswered: false,
          };

          const first = yield* store.listThreads(workspaceId, all, {
            after: Option.none(),
            limit: 2,
          });

          assert.deepStrictEqual(
            first.map(({ thread }) => thread.id),
            [recent.id, old.id]
          );

          const last = first.at(-1);

          assert.isDefined(last);

          const rest = yield* store.listThreads(workspaceId, all, {
            after: Option.some({
              lastCommentAt: Option.getOrThrow(last.lastCommentAt),
              threadId: last.thread.id,
              waiting: last.unanswered > 0,
            }),
            limit: 2,
          });

          assert.deepStrictEqual(
            rest.map(({ thread }) => thread.id),
            [answered.id]
          );

          const waiting = yield* store.listThreads(
            workspaceId,
            { ...all, unanswered: true },
            { after: Option.none(), limit: 10 }
          );

          assert.lengthOf(waiting, 2);

          const onOther = yield* store.listThreads(
            workspaceId,
            { ...all, channelId: Option.some(other) },
            { after: Option.none(), limit: 10 }
          );

          assert.deepStrictEqual(
            onOther.map(({ thread }) => thread.id),
            [old.id]
          );

          const ofPost = yield* store.listThreads(
            workspaceId,
            { ...all, postId: Option.some(recent.postId) },
            { after: Option.none(), limit: 10 }
          );

          assert.deepStrictEqual(
            ofPost.map(({ thread }) => thread.id),
            [recent.id]
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect("journals a reply through every state", () =>
    Effect.gen(function* journals() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* EngagementStore;

      const authorId = UserIdSchema.make(
        "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
      );

      const thread = yield* threadOn(
        workspaceId,
        yield* newId(ChannelIdSchema),
        "2043-03-05T10:20:00.000Z"
      );

      yield* Effect.gen(function* checks() {
        yield* store.follow([thread]);

        const comment = yield* commentOn(thread, 1, "2043-03-05T10:25:00.000Z");

        yield* store.saveComments([comment]);

        const written = writeReply(
          yield* newId(ReplyIdSchema),
          comment,
          Option.some(authorId),
          "Thank you!",
          utc("2043-03-05T10:30:00.000Z")
        );

        yield* store.saveReply(written);
        assert.deepStrictEqual(
          yield* store.reply(written.id),
          Option.some(written)
        );

        const begun = Result.getOrThrow(
          beginSending(written, utc("2043-03-05T10:30:01.000Z"))
        );

        yield* store.saveReply(begun);
        assert.deepStrictEqual(
          yield* store.reply(written.id),
          Option.some(begun)
        );

        const sent = Result.getOrThrow(
          settleReply(
            begun,
            {
              _tag: "sent",
              permalink: Option.some("https://social.example/@studio/3001"),
              platformCommentId: "3001",
            },
            utc("2043-03-05T10:30:02.000Z")
          )
        );

        yield* store.saveReply(sent);
        assert.deepStrictEqual(yield* store.repliesOf(thread.id), [sent]);

        const records = yield* EngagementRecords;

        assert.deepStrictEqual(yield* records.exportUser(authorId), [
          {
            channelId: thread.channelId,
            createdAt: written.createdAt,
            id: written.id,
            permalink: "https://social.example/@studio/3001",
            postId: thread.postId,
            status: "sent",
            text: "Thank you!",
            workspaceId,
          },
        ]);

        // The account closes: the reply stays, without its author.
        yield* records.forgetUser(authorId);

        assert.deepStrictEqual(yield* records.exportUser(authorId), []);
        assert.deepStrictEqual(
          (yield* store.reply(written.id)).pipe(
            Option.map((kept) => [kept.authorId, kept.text])
          ),
          Option.some([Option.none(), "Thank you!"])
        );
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect(
    "keeps nothing of a workspace erased, even what is saved after",
    () =>
      Effect.gen(function* erases() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;
        const records = yield* EngagementRecords;
        const channelId = yield* newId(ChannelIdSchema);

        const thread = yield* threadOn(
          workspaceId,
          channelId,
          "2043-03-06T10:20:00.000Z"
        );

        const later = yield* threadOn(
          workspaceId,
          channelId,
          "2043-03-06T10:21:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const comment = yield* commentOn(
            thread,
            1,
            "2043-03-06T10:25:00.000Z"
          );

          yield* store.saveComments([comment]);

          const reply = writeReply(
            yield* newId(ReplyIdSchema),
            comment,
            Option.none(),
            "Thank you!",
            utc("2043-03-06T10:30:00.000Z")
          );

          yield* store.saveReply(reply);
          yield* records.eraseWorkspace(workspaceId);

          assert.deepStrictEqual(yield* store.thread(thread.id), Option.none());
          assert.deepStrictEqual(yield* store.commentsOf(thread.id), []);
          assert.deepStrictEqual(yield* store.reply(reply.id), Option.none());

          // A run that read the thread before the erasure saves after it.
          yield* store.saveComments([
            yield* commentOn(thread, 2, "2043-03-06T10:26:00.000Z"),
          ]);
          yield* store.saveReply(reply);
          yield* store.saveCollections([thread]);

          assert.deepStrictEqual(yield* store.commentsOf(thread.id), []);
          assert.deepStrictEqual(yield* store.reply(reply.id), Option.none());

          // And one that listed its posts before follows none of them after.
          assert.strictEqual(yield* store.follow([thread, later]), 0);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "purges the threads whose collection ended long enough ago, with what they hold",
    () =>
      Effect.gen(function* purges() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;
        const channelId = yield* newId(ChannelIdSchema);

        // Long before any other suite's rows: the purge reads every thread.
        const ended = endCollection(
          yield* threadOn(workspaceId, channelId, "2031-01-01T10:00:00.000Z"),
          "window",
          utc("2031-01-31T10:00:00.000Z")
        );

        const reading2 = yield* threadOn(
          workspaceId,
          channelId,
          "2031-01-02T10:00:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([ended, reading2]);
          yield* store.saveComments([
            yield* commentOn(ended, 1, "2031-01-01T10:25:00.000Z"),
          ]);

          assert.strictEqual(
            yield* store.purge(utc("2031-01-31T09:59:59.999Z"), 100),
            0
          );
          assert.strictEqual(
            yield* store.purge(utc("2031-01-31T10:00:00.000Z"), 100),
            1
          );
          assert.deepStrictEqual(yield* store.thread(ended.id), Option.none());
          assert.deepStrictEqual(yield* store.commentsOf(ended.id), []);
          assert.isTrue(Option.isSome(yield* store.thread(reading2.id)));
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );
});
