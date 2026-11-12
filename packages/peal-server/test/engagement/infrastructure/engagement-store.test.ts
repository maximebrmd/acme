import { assert, layer } from "@effect/vitest";
import {
  DateTime,
  Deferred,
  Duration,
  Effect,
  Fiber,
  Layer,
  Option,
  Result,
} from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

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
import { textOfHtml } from "#shared/domain/html-text.ts";
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
    authorId: Option.none(),
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

  it.effect(
    "stops reading a post removed from its platform, a read finishing after it included",
    () =>
      Effect.gen(function* removed() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;
        const records = yield* EngagementRecords;
        const channelId = yield* newId(ChannelIdSchema);

        const thread = yield* threadOn(
          workspaceId,
          channelId,
          "2043-03-05T10:20:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const at = utc("2043-03-05T10:30:00.000Z");
          const removedAt = utc("2043-03-05T10:31:00.000Z");

          // A read that began before the post was removed.
          const [due] = yield* store.dueOn(at, [channelId], 10);

          yield* records.postRemoved(thread.targetId, removedAt);

          if (due !== undefined) {
            yield* store.saveCollections([
              recordCollection(
                due,
                utc("2043-03-05T10:31:30.000Z"),
                at,
                Duration.days(30)
              ),
            ]);
          }

          const [kept] = yield* SqlClient.SqlClient.use(
            (sql) =>
              sql<{
                readonly endReason: string | null;
                readonly nextCollectionAt: Date | null;
              }>`SELECT end_reason AS "endReason", next_collection_at AS "nextCollectionAt" FROM engagement.threads WHERE target_id = ${thread.targetId}`
          ).pipe(Effect.orDie);

          assert.deepStrictEqual(kept, {
            endReason: "removed",
            nextCollectionAt: null,
          });
          assert.deepStrictEqual(
            yield* store.dueOn(
              utc("2043-03-06T10:30:00.000Z"),
              [channelId],
              10
            ),
            []
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

  it.effect(
    "stores whatever a platform wrote, once the domain made it storable",
    () =>
      Effect.gen(function* hostile() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;

        const thread = yield* threadOn(
          workspaceId,
          yield* newId(ChannelIdSchema),
          "2043-03-07T10:20:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const nul = String.fromCodePoint(0);
          const lone = String.fromCodePoint(0xd8_00);
          const at = utc("2043-03-07T10:25:00.000Z");

          // What Postgres refuses in a text or in JSON, in every field.
          const comment = receiveComment(
            yield* newId(CommentIdSchema),
            thread,
            reading(1, {
              author: Option.some({
                displayName: Option.some(`Ada${nul}${lone}`),
                handle: `ada${nul}${lone}@social.example`,
                platformId: `70${nul}01`,
              }),
              permalink: Option.some(`https://social.example/1${nul}`),
              platformCommentId: `20${nul}01${lone}`,
              text: textOfHtml(`<p>Hello&#xD800;&#0;${nul}${lone}</p>`),
              writtenAt: at,
            }),
            at
          );

          yield* store.saveComments([comment]);

          assert.deepStrictEqual(yield* store.commentsOf(thread.id), [comment]);
          assert.notInclude(comment.text, nul);
          assert.isTrue(comment.text.isWellFormed());
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "journals one reply a comment at a time and one a key, whatever requests come together",
    () =>
      Effect.gen(function* oneAtATime() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;

        const thread = yield* threadOn(
          workspaceId,
          yield* newId(ChannelIdSchema),
          "2043-03-08T10:20:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const first = yield* commentOn(thread, 1, "2043-03-08T10:25:00.000Z");

          const second = yield* commentOn(
            thread,
            2,
            "2043-03-08T10:26:00.000Z"
          );

          yield* store.saveComments([first, second]);

          const at = utc("2043-03-08T10:30:00.000Z");

          const written = (to: typeof first, text: string) =>
            newId(ReplyIdSchema).pipe(
              Effect.map((id) => writeReply(id, to, Option.none(), text, at))
            );

          // Eight requests to answer one comment, sent together, each on
          // a connection of its own: the database lets one through.
          const together = yield* Effect.forEach(
            Array.from({ length: 8 }, (_, n) => `Thank you, ${String(n)}!`),
            (text) =>
              written(first, text).pipe(
                Effect.flatMap((reply) =>
                  store.journalReply(reply, Option.none())
                )
              ),
            { concurrency: "unbounded" }
          );

          assert.lengthOf(
            together.filter(({ _tag }) => _tag === "journalled"),
            1
          );
          assert.lengthOf(
            together.filter(({ _tag }) => _tag === "pending"),
            7
          );

          const [pending] = yield* store.repliesOf(thread.id);

          assert.isDefined(pending);
          assert.deepInclude(together, {
            _tag: "pending",
            replyId: pending.id,
          });

          // A key names the reply it made: the same request again answers
          // it, another is refused, and both make nothing.
          const key = Option.some({
            key: "synthetic-reply-key",
            since: utc("2043-03-07T10:30:00.000Z"),
          });

          const keyed = yield* written(second, "With a key.");

          assert.deepStrictEqual(yield* store.journalReply(keyed, key), {
            _tag: "journalled",
          });
          assert.deepStrictEqual(
            yield* store.journalReply(
              yield* written(second, "With a key."),
              key
            ),
            { _tag: "replayed", reply: keyed }
          );
          assert.deepStrictEqual(
            yield* store.journalReply(
              yield* written(second, "Something else."),
              key
            ),
            { _tag: "keyReused" }
          );

          // Without the key, the comment has a reply on its way.
          assert.deepStrictEqual(
            yield* store.journalReply(
              yield* written(second, "With a key."),
              Option.none()
            ),
            { _tag: "pending", replyId: keyed.id }
          );

          // A use of the key older than its lifetime is forgotten.
          const settled = Result.getOrThrow(
            settleReply(keyed, { _tag: "failed", reason: "refused" }, at)
          );

          assert.isTrue(yield* store.advanceReply(settled, keyed));

          const later = yield* written(second, "A new request.");

          assert.deepStrictEqual(
            yield* store.journalReply(
              later,
              Option.some({ key: "synthetic-reply-key", since: at })
            ),
            { _tag: "journalled" }
          );
          assert.lengthOf(yield* store.repliesOf(thread.id), 3);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "moves a reply only from the status it was read in, and claims a call only while it is on its way",
    () =>
      Effect.gen(function* conditional() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;

        const thread = yield* threadOn(
          workspaceId,
          yield* newId(ChannelIdSchema),
          "2043-03-09T10:20:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const comment = yield* commentOn(
            thread,
            1,
            "2043-03-09T10:25:00.000Z"
          );

          yield* store.saveComments([comment]);

          const at = utc("2043-03-09T10:30:00.000Z");

          const written = writeReply(
            yield* newId(ReplyIdSchema),
            comment,
            Option.none(),
            "Thank you!",
            at
          );

          yield* store.journalReply(written, Option.none());

          const begun = Result.getOrThrow(beginSending(written, at));

          const handedOver = Result.getOrThrow(
            settleReply(
              written,
              { _tag: "unconfirmed", reason: "interrupted" },
              at
            )
          );

          // A gate claims its call; while the claim is fresh the reply is
          // not among those to hand over, and past it, it is.
          assert.isTrue(yield* store.claimCall(written.id, at));

          const stranded = (called: string) =>
            store
              .strandedReplies(at, utc(called), 1000)
              .pipe(
                Effect.map(
                  (found) => found.filter(({ id }) => id === written.id).length
                )
              );

          assert.strictEqual(yield* stranded("2043-03-09T10:29:59.000Z"), 0);
          assert.strictEqual(yield* stranded("2043-03-09T10:30:00.000Z"), 1);

          // The handover wins: a run that read the reply on its way moves
          // nothing after it, and no gate claims a call for it.
          assert.isTrue(yield* store.advanceReply(handedOver, written));
          assert.isFalse(yield* store.advanceReply(begun, written));
          assert.isFalse(yield* store.claimCall(written.id, at));
          assert.deepStrictEqual(
            yield* store.reply(written.id),
            Option.some(handedOver)
          );

          // Nor does a run that had begun settle a reply a person settled.
          const found = Result.getOrThrow(
            settleReply(begun, { _tag: "failed", reason: "refused" }, at)
          );

          assert.isFalse(yield* store.advanceReply(found, begun));
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

        assert.deepStrictEqual(
          yield* store.journalReply(written, Option.none()),
          { _tag: "journalled" }
        );
        assert.deepStrictEqual(
          yield* store.reply(written.id),
          Option.some(written)
        );

        // On its way: listed among those written by then, and not before.
        const onTheirWay = (before: string) =>
          store
            .strandedReplies(utc(before), utc(before), 1000)
            .pipe(
              Effect.map((found) => found.filter(({ id }) => id === written.id))
            );

        assert.deepStrictEqual(yield* onTheirWay("2043-03-05T10:30:00.000Z"), [
          written,
        ]);
        assert.deepStrictEqual(
          yield* onTheirWay("2043-03-05T10:29:59.000Z"),
          []
        );

        const begun = Result.getOrThrow(
          beginSending(written, utc("2043-03-05T10:30:01.000Z"))
        );

        assert.isTrue(yield* store.advanceReply(begun, written));
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

        assert.isTrue(yield* store.advanceReply(sent, begun));
        assert.deepStrictEqual(yield* store.repliesOf(thread.id), [sent]);
        assert.deepStrictEqual(
          yield* onTheirWay("2043-03-05T11:00:00.000Z"),
          []
        );

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

          yield* store.journalReply(reply, Option.none());
          yield* records.eraseWorkspace(workspaceId);

          assert.deepStrictEqual(yield* store.thread(thread.id), Option.none());
          assert.deepStrictEqual(yield* store.commentsOf(thread.id), []);
          assert.deepStrictEqual(yield* store.reply(reply.id), Option.none());

          // A run that read the thread before the erasure saves after it.
          yield* store.saveComments([
            yield* commentOn(thread, 2, "2043-03-06T10:26:00.000Z"),
          ]);
          assert.deepStrictEqual(
            yield* store.journalReply(reply, Option.none()),
            { _tag: "dropped" }
          );
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

  it.effect(
    "holds a thread for one writer at a time, who reads its comments after",
    () =>
      Effect.gen(function* holds() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* EngagementStore;
        const sql = yield* SqlClient.SqlClient;
        const channelId = yield* newId(ChannelIdSchema);

        const thread = yield* threadOn(
          workspaceId,
          channelId,
          "2043-04-02T10:20:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const kept = yield* commentOn(thread, 1, "2043-04-02T10:25:00.000Z");

          yield* store.saveComments([kept]);

          const held = yield* Deferred.make<true>();
          const release = yield* Deferred.make<true>();

          // The collection holds the thread, as it reconciles.
          const collecting = yield* sql
            .withTransaction(
              Effect.gen(function* reconciling() {
                yield* store.lockThread(thread.id);
                yield* Deferred.succeed(held, true);
                yield* Deferred.await(release);
                yield* store.saveComments([kept]);
              })
            )
            .pipe(Effect.forkChild);

          yield* Deferred.await(held);

          // A member marks the comment answered meanwhile: they wait for
          // the thread, then read what the collection left.
          const answering = yield* sql
            .withTransaction(
              Effect.gen(function* member() {
                yield* store.lockThread(thread.id);

                const current = yield* store.comment(kept.id);

                yield* store.saveComments(
                  Option.toArray(current).map((found) =>
                    markAnswered(found, utc("2043-04-02T10:30:00.000Z"))
                  )
                );
              })
            )
            .pipe(Effect.forkChild);

          // Real time, for the member's transaction to reach the lock.
          yield* TestClock.withLive(Effect.sleep("200 millis"));
          yield* Deferred.succeed(release, true);
          yield* Fiber.join(collecting);
          yield* Fiber.join(answering);

          // The member's change is what stays.
          assert.strictEqual(
            Option.getOrUndefined(yield* store.comment(kept.id))?.state,
            "answered"
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      }),
    { timeout: 20_000 }
  );
});
