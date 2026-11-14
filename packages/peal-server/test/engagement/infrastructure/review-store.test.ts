import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";
import { SqlClient } from "effect/sql";

import { ReviewStore } from "#engagement/application/ports/review-store.ts";
import { ReviewIdSchema } from "#engagement/domain/review-id.ts";
import { ReviewReplyIdSchema } from "#engagement/domain/review-reply-id.ts";
import {
  beginReviewReply,
  settleReviewReply,
  writeReviewReply,
} from "#engagement/domain/review-reply.ts";
import { ReviewThreadIdSchema } from "#engagement/domain/review-thread-id.ts";
import {
  followLocation,
  recordReviewRead,
} from "#engagement/domain/review-thread.ts";
import type { ReviewThread } from "#engagement/domain/review-thread.ts";
import {
  markReviewAnswered,
  receiveReview,
} from "#engagement/domain/review.ts";
import type { ReviewReading } from "#engagement/domain/review.ts";
import { DrizzleReviewStore } from "#engagement/infrastructure/drizzle-review-store.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { reviewReading } from "#test/engagement/support.ts";

// The Postgres store of reviews, on the database DATABASE_URL names. Each
// test writes rows of its own workspace, at instants no other suite uses
// (2047; the retention in 1931), and deletes them after.

const StoreTest = DrizzleReviewStore.pipe(Layer.provideMerge(DatabaseTest));

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const forget = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM engagement.review_threads WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.orDie);

const locationOf = Effect.fn("locationOf")(function* locationOf(
  workspaceId: WorkspaceId,
  at: string
) {
  return followLocation(
    yield* newId(ReviewThreadIdSchema),
    { channelId: yield* newId(ChannelIdSchema), workspaceId },
    utc(at)
  );
});

const reviewOn = Effect.fn("reviewOn")(function* reviewOn(
  thread: ReviewThread,
  n: number,
  at: string,
  changed: Partial<ReviewReading> = {}
) {
  return receiveReview(
    yield* newId(ReviewIdSchema),
    thread,
    reviewReading(n, { updatedAt: utc(at), writtenAt: utc(at), ...changed }),
    utc(at)
  );
});

layer(StoreTest)("the review store", (it) => {
  it.effect("follows a location once, and reads it when due", () =>
    Effect.gen(function* follows() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* ReviewStore;
      const thread = yield* locationOf(workspaceId, "2047-02-01T10:00:00.000Z");

      yield* Effect.gen(function* checks() {
        assert.strictEqual(yield* store.follow([thread]), 1);
        assert.strictEqual(yield* store.follow([thread]), 0);

        const due = yield* store.due(utc("2047-02-01T10:00:00.000Z"), 1000);

        assert.deepStrictEqual(
          due.filter(({ id }) => id === thread.id),
          [thread]
        );
        assert.isAtLeast(
          yield* store.countDue(utc("2047-02-01T10:00:00.000Z")),
          1
        );
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect(
    "keeps reviews once, counts those waiting, and lists the location",
    () =>
      Effect.gen(function* keeps() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* ReviewStore;

        const thread = yield* locationOf(
          workspaceId,
          "2047-02-02T10:00:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const first = yield* reviewOn(thread, 1, "2047-02-02T09:00:00.000Z", {
            reply: Option.some({
              moderation: Option.some("approved"),
              text: "Thank you",
              updatedAt: utc("2047-02-02T09:30:00.000Z"),
            }),
            reviewerName: Option.none(),
          });

          const second = yield* reviewOn(thread, 2, "2047-02-02T09:10:00.000Z");

          assert.deepStrictEqual(
            (yield* store.saveReviews([first, second])).map(({ id }) => id),
            [first.id, second.id]
          );

          // The same review under another id is passed over.
          const again = yield* reviewOn(thread, 1, "2047-02-02T09:00:00.000Z");

          assert.deepStrictEqual(yield* store.saveReviews([again]), []);

          yield* store.recount(thread.id);

          assert.deepStrictEqual(yield* store.reviewsOf(thread.id), [
            second,
            first,
          ]);

          const [listed] = yield* store.listThreads(
            workspaceId,
            { channelId: Option.none(), unanswered: true },
            { after: Option.none(), limit: 10 }
          );

          assert.strictEqual(listed?.reviews, 2);
          assert.strictEqual(listed?.unanswered, 1);
          assert.deepStrictEqual(
            listed?.lastReviewAt,
            Option.some(utc("2047-02-02T09:10:00.000Z"))
          );

          // A member says the second needs no answer: nothing waits.
          yield* store.saveReviews([
            markReviewAnswered(second, true, utc("2047-02-02T10:00:00.000Z")),
          ]);
          yield* store.recount(thread.id);

          assert.deepStrictEqual(
            yield* store.listThreads(
              workspaceId,
              { channelId: Option.none(), unanswered: true },
              { after: Option.none(), limit: 10 }
            ),
            []
          );

          yield* store.deleteReviews([first.id]);
          yield* store.recount(thread.id);

          const summary = yield* store.thread(thread.id);

          assert.strictEqual(Option.getOrThrow(summary).reviews, 1);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "journals one reply a review at a time, and moves it only from the state it was read in",
    () =>
      Effect.gen(function* journals() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* ReviewStore;

        const thread = yield* locationOf(
          workspaceId,
          "2047-02-03T10:00:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([thread]);

          const kept = yield* reviewOn(thread, 1, "2047-02-03T09:00:00.000Z");

          yield* store.saveReviews([kept]);

          const at = utc("2047-02-03T10:00:00.000Z");

          const reply = writeReviewReply(
            yield* newId(ReviewReplyIdSchema),
            kept,
            Option.none(),
            "Thanks!",
            at
          );

          const other = writeReviewReply(
            yield* newId(ReviewReplyIdSchema),
            kept,
            Option.none(),
            "Thanks again!",
            at
          );

          assert.deepStrictEqual(yield* store.journalReply(reply), {
            _tag: "journalled",
          });
          assert.deepStrictEqual(yield* store.journalReply(other), {
            _tag: "pending",
            replyId: reply.id,
          });

          const begun = Result.getOrThrow(beginReviewReply(reply, at));

          assert.isTrue(yield* store.advanceReply(begun, reply));
          assert.isFalse(yield* store.advanceReply(begun, reply));
          assert.isTrue(yield* store.claimCall(reply.id, at));

          assert.deepStrictEqual(
            (yield* store.strandedReplies(
              utc("2047-02-03T11:00:00.000Z"),
              utc("2047-02-03T10:30:00.000Z"),
              100
            )).filter(({ id }) => id === reply.id),
            [begun]
          );

          const sent = Result.getOrThrow(
            settleReviewReply(
              begun,
              {
                _tag: "sent",
                reply: {
                  moderation: Option.none(),
                  text: "Thanks!",
                  updatedAt: at,
                },
              },
              at
            )
          );

          assert.isTrue(yield* store.advanceReply(sent, begun));
          assert.isFalse(yield* store.claimCall(reply.id, at));
          assert.deepStrictEqual(
            yield* store.reply(reply.id),
            Option.some(sent)
          );
          assert.deepStrictEqual(yield* store.repliesTo(kept.id), [sent]);
          assert.deepStrictEqual(yield* store.repliesOf(thread.id), [sent]);

          // Settled, it leaves room for another.
          assert.deepStrictEqual(yield* store.journalReply(other), {
            _tag: "journalled",
          });

          // A reply to a review that is gone is dropped.
          yield* store.deleteReviews([kept.id]);

          const late = writeReviewReply(
            yield* newId(ReviewReplyIdSchema),
            kept,
            Option.none(),
            "Late",
            at
          );

          assert.deepStrictEqual(yield* store.journalReply(late), {
            _tag: "dropped",
          });
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect("deletes a channel's thread with everything it holds", () =>
    Effect.gen(function* channelGone() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* ReviewStore;
      const thread = yield* locationOf(workspaceId, "2047-02-04T10:00:00.000Z");

      yield* Effect.gen(function* checks() {
        yield* store.follow([thread]);

        const kept = yield* reviewOn(thread, 1, "2047-02-04T09:00:00.000Z");

        yield* store.saveReviews([kept]);

        assert.strictEqual(yield* store.channelGone(thread.channelId), 1);
        assert.deepStrictEqual(yield* store.review(kept.id), Option.none());
        assert.deepStrictEqual(yield* store.thread(thread.id), Option.none());
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect(
    "forgets reviews past their time, and threads no read reached since",
    () =>
      Effect.gen(function* purges() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* ReviewStore;
        const read = yield* locationOf(workspaceId, "1931-01-01T10:00:00.000Z");

        const unread = yield* locationOf(
          workspaceId,
          "1931-01-01T10:00:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([read, unread]);
          yield* store.saveThread(
            recordReviewRead(
              read,
              { averageRating: Option.none(), totalReviewCount: Option.none() },
              Option.none(),
              utc("1931-07-01T10:00:00.000Z"),
              utc("1931-07-01T10:00:00.000Z")
            )
          );

          const old = yield* reviewOn(read, 1, "1931-05-01T10:00:00.000Z");
          const fresh = yield* reviewOn(read, 2, "1931-06-15T10:00:00.000Z");

          yield* store.saveReviews([old, fresh]);
          yield* store.recount(read.id);

          const purged = yield* store.purge(
            utc("1931-06-01T00:00:00.000Z"),
            1000
          );

          assert.isAtLeast(purged.reviews, 1);
          assert.isAtLeast(purged.threads, 1);
          assert.deepStrictEqual(yield* store.review(old.id), Option.none());
          assert.isTrue(Option.isSome(yield* store.review(fresh.id)));
          assert.strictEqual(
            Option.getOrThrow(yield* store.thread(read.id)).reviews,
            1
          );
          assert.deepStrictEqual(yield* store.thread(unread.id), Option.none());
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );
});
