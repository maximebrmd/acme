import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  or,
  sql as drizzleSql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest } from "effect/crypto";
import { SqlClient } from "effect/sql";

import { ReviewStore } from "#engagement/application/ports/review-store.ts";
import type {
  ReviewReplyJournalled,
  ReviewReplyKey,
  ReviewThreadCursor,
  ReviewThreadFilter,
  ReviewThreadSummary,
} from "#engagement/application/ports/review-store.ts";
import { ReviewReplyIdSchema } from "#engagement/domain/review-reply-id.ts";
import { ReviewReply } from "#engagement/domain/review-reply.ts";
import type { ReviewReplyStatus } from "#engagement/domain/review-reply.ts";
import { ReviewThread } from "#engagement/domain/review-thread.ts";
import { Review } from "#engagement/domain/review.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { holdFollowingLock } from "./following-lock.ts";
import {
  erasedWorkspaces,
  reviewReplies,
  reviewThreads,
  reviews,
} from "./schema.ts";

type ThreadRow = typeof reviewThreads.$inferSelect;

type ReviewRow = typeof reviews.$inferSelect;

type ReplyRow = typeof reviewReplies.$inferSelect;

// Rows are decoded with the domain's schemas, so a row the domain could
// not have written fails loudly instead of being trusted.
const decodeThread = Schema.decodeUnknownEffect(ReviewThread);
const decodeReview = Schema.decodeUnknownEffect(Review);
const decodeReply = Schema.decodeUnknownEffect(ReviewReply);
const decodeReplyId = Schema.decodeUnknownEffect(ReviewReplyIdSchema);

const utc = (value: Date | null) =>
  value === null ? undefined : DateTime.fromDateUnsafe(value);

const instant = (value: Date | null) => Option.fromUndefinedOr(utc(value));

const date = (at: DateTime.Utc) => DateTime.toDateUtc(at);

const nullableDate = (at: Option.Option<DateTime.Utc>) =>
  at.pipe(Option.map(date), Option.getOrNull);

const iso = (at: Option.Option<DateTime.Utc>) =>
  at.pipe(Option.map(DateTime.formatIso), Option.getOrNull);

const failed = (cause: unknown) => new DatabaseError({ cause });

const threadOf = (row: ThreadRow) =>
  decodeThread({
    averageRating: Option.fromNullOr(row.averageRating),
    channelId: row.channelId,
    createdAt: utc(row.createdAt),
    id: row.id,
    lastReadAt: instant(row.lastReadAt),
    nextReadAt: utc(row.nextReadAt),
    totalReviewCount: Option.fromNullOr(row.totalReviewCount),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const summaryOf = (row: ThreadRow) =>
  threadOf(row).pipe(
    Effect.map((thread): ReviewThreadSummary => ({
      lastReviewAt: instant(row.lastReviewAt),
      reviews: row.reviewCount,
      thread,
      unanswered: row.unansweredCount,
    }))
  );

const threadRowOf = (thread: ReviewThread) => ({
  averageRating: Option.getOrNull(thread.averageRating),
  channelId: thread.channelId,
  createdAt: date(thread.createdAt),
  id: thread.id,
  lastReadAt: nullableDate(thread.lastReadAt),
  nextReadAt: date(thread.nextReadAt),
  totalReviewCount: Option.getOrNull(thread.totalReviewCount),
  workspaceId: thread.workspaceId,
});

const reviewOf = (row: ReviewRow) =>
  decodeReview({
    answeredAt: instant(row.answeredAt),
    channelId: row.channelId,
    id: row.id,
    photoCount: row.photoCount,
    platformReviewId: row.platformReviewId,
    rating: row.rating,
    receivedAt: utc(row.receivedAt),
    reply:
      row.replyText === null
        ? Option.none()
        : Option.some({
            moderation: Option.fromNullOr(row.replyModeration),
            text: row.replyText,
            updatedAt: utc(row.replyUpdatedAt),
          }),
    reviewerName: Option.fromNullOr(row.reviewerName),
    text: row.text,
    threadId: row.threadId,
    updatedAt: utc(row.updatedAt),
    workspaceId: row.workspaceId,
    writtenAt: utc(row.writtenAt),
  }).pipe(Effect.orDie);

const reviewRowOf = (review: Review) => ({
  answeredAt: nullableDate(review.answeredAt),
  channelId: review.channelId,
  id: review.id,
  photoCount: review.photoCount,
  platformReviewId: review.platformReviewId,
  rating: review.rating,
  receivedAt: date(review.receivedAt),
  replyModeration: review.reply.pipe(
    Option.flatMap(({ moderation }) => moderation),
    Option.getOrNull
  ),
  replyText: review.reply.pipe(
    Option.map(({ text }) => text),
    Option.getOrNull
  ),
  replyUpdatedAt: review.reply.pipe(
    Option.map(({ updatedAt }) => date(updatedAt)),
    Option.getOrNull
  ),
  reviewerName: Option.getOrNull(review.reviewerName),
  text: review.text,
  threadId: review.threadId,
  updatedAt: date(review.updatedAt),
  workspaceId: review.workspaceId,
  writtenAt: date(review.writtenAt),
});

const statusOf = (row: ReplyRow) => {
  if (row.status === "sending") {
    return { _tag: "sending", attemptedAt: instant(row.attemptedAt) };
  }

  if (row.status === "sent" || row.status === "withdrawn") {
    return { _tag: row.status, at: utc(row.settledAt) };
  }

  return { _tag: row.status, at: utc(row.settledAt), reason: row.reason };
};

const replyOf = (row: ReplyRow) =>
  decodeReply({
    authorId: Option.fromNullOr(row.authorId),
    channelId: row.channelId,
    createdAt: utc(row.createdAt),
    id: row.id,
    reviewId: row.reviewId,
    status: statusOf(row),
    text: row.text,
    threadId: row.threadId,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const statusColumns = (status: ReviewReplyStatus) => {
  switch (status._tag) {
    case "sending": {
      return {
        attemptedAt: iso(status.attemptedAt),
        reason: null,
        settledAt: null,
      };
    }

    case "sent":
    case "withdrawn": {
      return {
        attemptedAt: null,
        reason: null,
        settledAt: DateTime.formatIso(status.at),
      };
    }

    case "failed":
    case "unconfirmed": {
      return {
        attemptedAt: null,
        reason: status.reason,
        settledAt: DateTime.formatIso(status.at),
      };
    }

    default: {
      return status satisfies never;
    }
  }
};

// Threads with a review waiting come first, as the cursor reads them.
const waiting = drizzleSql<boolean>`(${reviewThreads.unansweredCount} > 0)`;

const filtered = (workspaceId: WorkspaceId, filter: ReviewThreadFilter) =>
  and(
    eq(reviewThreads.workspaceId, workspaceId),
    drizzleSql`${reviewThreads.reviewCount} > 0`,
    filter.channelId.pipe(
      Option.map((channelId) => eq(reviewThreads.channelId, channelId)),
      Option.getOrUndefined
    ),
    filter.unanswered
      ? drizzleSql`${reviewThreads.unansweredCount} > 0`
      : undefined
  );

const afterCursor = (cursor: ReviewThreadCursor) =>
  drizzleSql`(${waiting}, ${reviewThreads.lastReviewAt}, ${reviewThreads.id}) < (${cursor.waiting}, ${DateTime.formatIso(cursor.lastReviewAt)}::timestamptz, ${cursor.threadId}::uuid)`;

/**
 * The ReviewStore on the engagement schema. Deleting a thread deletes its
 * reviews and their replies, which reference it with ON DELETE CASCADE;
 * following takes the same advisory lock as comments, so a workspace an
 * erasure recorded is never followed after.
 */
export const DrizzleReviewStore = Layer.effect(
  ReviewStore,
  Effect.gen(function* DrizzleReviewStore() {
    const db = yield* Drizzle;
    const sql = yield* SqlClient.SqlClient;
    const digest = yield* Digest.Digest;

    const hashOf = (text: string) =>
      digest
        .digestHex(Digest.sha256, new TextEncoder().encode(text))
        .pipe(Effect.mapError(failed));

    // The reply a key made in the workspace, compared with what comes
    // with the key now.
    const madeUnder = Effect.fn("ReviewStore.madeUnder")(function* madeUnder(
      saved: ReviewReply,
      keyDigest: string
    ) {
      const [row] = yield* db
        .select()
        .from(reviewReplies)
        .where(
          and(
            eq(reviewReplies.workspaceId, saved.workspaceId),
            eq(reviewReplies.keyDigest, keyDigest)
          )
        )
        .limit(1)
        .pipe(Effect.mapError(failed));

      if (row === undefined) {
        return Option.none<ReviewReplyJournalled>();
      }

      const earlier = yield* replyOf(row);

      const same =
        earlier.reviewId === saved.reviewId && earlier.text === saved.text;

      return Option.some<ReviewReplyJournalled>(
        same ? { _tag: "replayed", reply: earlier } : { _tag: "keyReused" }
      );
    });

    const followLocked = Effect.fn("ReviewStore.followLocked")(
      function* followLocked(followed: readonly ReviewThread[]) {
        yield* holdFollowingLock(sql);

        const erased = yield* db
          .select({ workspaceId: erasedWorkspaces.workspaceId })
          .from(erasedWorkspaces)
          .where(
            inArray(erasedWorkspaces.workspaceId, [
              ...new Set(followed.map(({ workspaceId }) => workspaceId)),
            ])
          );

        const gone = new Set(erased.map(({ workspaceId }) => workspaceId));

        const kept = followed.filter(
          ({ workspaceId }) => !gone.has(workspaceId)
        );

        if (kept.length === 0) {
          return 0;
        }

        const inserted = yield* db
          .insert(reviewThreads)
          .values(kept.map(threadRowOf))
          .onConflictDoNothing()
          .returning({ id: reviewThreads.id });

        return inserted.length;
      }
    );

    const follow = Effect.fn("ReviewStore.follow")(function* follow(
      followed: readonly ReviewThread[]
    ) {
      if (followed.length === 0) {
        return 0;
      }

      return yield* sql
        .withTransaction(followLocked(followed))
        .pipe(Effect.mapError(failed));
    });

    const due = Effect.fn("ReviewStore.due")(function* due(
      at: DateTime.Utc,
      limit: number
    ) {
      const rows = yield* db
        .select()
        .from(reviewThreads)
        .where(lte(reviewThreads.nextReadAt, date(at)))
        .orderBy(asc(reviewThreads.nextReadAt), asc(reviewThreads.id))
        .limit(limit)
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(rows.map(threadOf));
    });

    const countDue = Effect.fn("ReviewStore.countDue")(function* countDue(
      at: DateTime.Utc
    ) {
      const [row] = yield* db
        .select({ due: drizzleSql<number>`count(*)::int` })
        .from(reviewThreads)
        .where(lte(reviewThreads.nextReadAt, date(at)))
        .pipe(Effect.mapError(failed));

      return row?.due ?? 0;
    });

    const thread = Effect.fn("ReviewStore.thread")(function* thread(
      threadId: string
    ) {
      const [row] = yield* db
        .select()
        .from(reviewThreads)
        .where(eq(reviewThreads.id, threadId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<ReviewThreadSummary>()
        : Option.some(yield* summaryOf(row));
    });

    const listThreads = Effect.fn("ReviewStore.listThreads")(
      function* listThreads(
        workspaceId: WorkspaceId,
        filter: ReviewThreadFilter,
        page: {
          readonly after: Option.Option<ReviewThreadCursor>;
          readonly limit: number;
        }
      ) {
        const rows = yield* db
          .select()
          .from(reviewThreads)
          .where(
            and(
              filtered(workspaceId, filter),
              page.after.pipe(Option.map(afterCursor), Option.getOrUndefined)
            )
          )
          .orderBy(
            desc(waiting),
            desc(reviewThreads.lastReviewAt),
            desc(reviewThreads.id)
          )
          .limit(page.limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(summaryOf));
      }
    );

    const lockThread = (threadId: string) =>
      sql`
        SELECT 1 FROM engagement.review_threads WHERE id = ${threadId} FOR UPDATE
      `.pipe(Effect.asVoid, Effect.mapError(failed));

    const saveThread = (saved: ReviewThread) =>
      db
        .update(reviewThreads)
        .set({
          averageRating: Option.getOrNull(saved.averageRating),
          lastReadAt: nullableDate(saved.lastReadAt),
          nextReadAt: date(saved.nextReadAt),
          totalReviewCount: Option.getOrNull(saved.totalReviewCount),
        })
        .where(eq(reviewThreads.id, saved.id))
        .pipe(Effect.asVoid, Effect.mapError(failed));

    const reviewsOf = Effect.fn("ReviewStore.reviewsOf")(function* reviewsOf(
      threadId: string
    ) {
      const rows = yield* db
        .select()
        .from(reviews)
        .where(eq(reviews.threadId, threadId))
        .orderBy(desc(reviews.updatedAt), desc(reviews.id))
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(rows.map(reviewOf));
    });

    const review = Effect.fn("ReviewStore.review")(function* review(
      reviewId: string
    ) {
      const [row] = yield* db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<Review>()
        : Option.some(yield* reviewOf(row));
    });

    // New reviews are inserted, known ones replaced, in one statement; a
    // review the thread holds under another id is passed over, so two
    // reads that met it together keep it once.
    const saveReviews = Effect.fn("ReviewStore.saveReviews")(
      function* saveReviews(saved: readonly Review[]) {
        if (saved.length === 0) {
          return [];
        }

        const known = new Set(
          (yield* db
            .select({ id: reviews.id })
            .from(reviews)
            .where(
              inArray(
                reviews.id,
                saved.map(({ id }) => id)
              )
            )
            .pipe(Effect.mapError(failed))).map(({ id }) => id)
        );

        const fresh = saved.filter(({ id }) => !known.has(id));
        const changed = saved.filter(({ id }) => known.has(id));

        const inserted =
          fresh.length === 0
            ? []
            : yield* db
                .insert(reviews)
                .values(fresh.map(reviewRowOf))
                .onConflictDoNothing()
                .returning({ id: reviews.id })
                .pipe(Effect.mapError(failed));

        yield* Effect.forEach(
          changed,
          (one) =>
            db
              .update(reviews)
              .set(reviewRowOf(one))
              .where(eq(reviews.id, one.id))
              .pipe(Effect.mapError(failed)),
          { discard: true }
        );

        const taken = new Set(inserted.map(({ id }) => id));

        return fresh.filter(({ id }) => taken.has(id));
      }
    );

    const deleteReviews = (reviewIds: readonly string[]) =>
      reviewIds.length === 0
        ? Effect.void
        : db
            .delete(reviews)
            .where(inArray(reviews.id, [...reviewIds]))
            .pipe(Effect.asVoid, Effect.mapError(failed));

    const recount = (threadId: string) =>
      sql`
        UPDATE engagement.review_threads AS thread
        SET review_count = counted.reviews,
            unanswered_count = counted.unanswered,
            last_review_at = counted.latest
        FROM (
          SELECT count(*)::int AS reviews,
                 (count(*) FILTER (
                   WHERE (reply_text IS NULL
                          OR reply_moderation = 'rejected')
                     AND answered_at IS NULL
                 ))::int AS unanswered,
                 max(updated_at) AS latest
          FROM engagement.reviews
          WHERE thread_id = ${threadId}::uuid
        ) AS counted
        WHERE thread.id = ${threadId}::uuid
      `.pipe(Effect.asVoid, Effect.mapError(failed));

    // Insert only, and only when the unique indexes allow it: one reply on
    // its way or unconfirmed a review, one reply a key. A reply whose
    // review went is dropped: the insert selects its review, and finds
    // none.
    const journalReply = Effect.fn("ReviewStore.journalReply")(
      function* journalReply(
        saved: ReviewReply,
        key: Option.Option<ReviewReplyKey>
      ) {
        const keyDigest = Option.isSome(key)
          ? yield* hashOf(key.value.key)
          : null;

        if (Option.isSome(key) && keyDigest !== null) {
          // A use of the key older than its lifetime is forgotten.
          yield* sql`
            UPDATE engagement.review_replies SET key_digest = NULL
            WHERE workspace_id = ${saved.workspaceId}::uuid
              AND key_digest = ${keyDigest}
              AND created_at <= ${DateTime.formatIso(key.value.since)}::timestamptz
          `.pipe(Effect.mapError(failed));

          const made = yield* madeUnder(saved, keyDigest);

          if (Option.isSome(made)) {
            return made.value;
          }
        }

        const status = statusColumns(saved.status);

        const inserted = yield* sql`
          INSERT INTO engagement.review_replies (
            id, review_id, thread_id, workspace_id, channel_id, author_id,
            text, created_at, status, attempted_at, settled_at, reason,
            key_digest
          )
          SELECT ${saved.id}::uuid, review.id, review.thread_id,
                 review.workspace_id, review.channel_id,
                 ${Option.getOrNull(saved.authorId)}::uuid, ${saved.text},
                 ${DateTime.formatIso(saved.createdAt)}::timestamptz,
                 ${saved.status._tag}, ${status.attemptedAt}::timestamptz,
                 ${status.settledAt}::timestamptz, ${status.reason}::text,
                 ${keyDigest}::text
          FROM engagement.reviews AS review
          WHERE review.id = ${saved.reviewId}::uuid
          ON CONFLICT DO NOTHING
          RETURNING id
        `.pipe(Effect.mapError(failed));

        if (inserted.length === 1) {
          const journalled: ReviewReplyJournalled = { _tag: "journalled" };

          return journalled;
        }

        // Refused: by the key, used by a request that came just before,
        // by a reply to the review that is not settled, or the review is
        // gone.
        if (keyDigest !== null) {
          const made = yield* madeUnder(saved, keyDigest);

          if (Option.isSome(made)) {
            return made.value;
          }
        }

        const [pending] = yield* db
          .select({ id: reviewReplies.id })
          .from(reviewReplies)
          .where(
            and(
              eq(reviewReplies.reviewId, saved.reviewId),
              inArray(reviewReplies.status, ["sending", "unconfirmed"])
            )
          )
          .limit(1)
          .pipe(Effect.mapError(failed));

        const refused: ReviewReplyJournalled =
          pending === undefined
            ? { _tag: "dropped" }
            : {
                _tag: "pending",
                replyId: yield* decodeReplyId(pending.id).pipe(Effect.orDie),
              };

        return refused;
      }
    );

    const reply = Effect.fn("ReviewStore.reply")(function* reply(
      replyId: string
    ) {
      const [row] = yield* db
        .select()
        .from(reviewReplies)
        .where(eq(reviewReplies.id, replyId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<ReviewReply>()
        : Option.some(yield* replyOf(row));
    });

    const repliesWhere = (where: ReturnType<typeof eq>) =>
      db
        .select()
        .from(reviewReplies)
        .where(where)
        .orderBy(asc(reviewReplies.id))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) => Effect.all(rows.map(replyOf)))
        );

    const repliesOf = (threadId: string) =>
      repliesWhere(eq(reviewReplies.threadId, threadId));

    const repliesTo = (reviewId: string) =>
      repliesWhere(eq(reviewReplies.reviewId, reviewId));

    // Only from the status it was read in, attempt included.
    const advanceReply = Effect.fn("ReviewStore.advanceReply")(
      function* advanceReply(next: ReviewReply, from: ReviewReply) {
        const status = statusColumns(next.status);
        const before = statusColumns(from.status);

        const moved = yield* sql`
          UPDATE engagement.review_replies
          SET status = ${next.status._tag},
              attempted_at = ${status.attemptedAt}::timestamptz,
              settled_at = ${status.settledAt}::timestamptz,
              reason = ${status.reason}::text
          WHERE id = ${next.id}::uuid
            AND status = ${from.status._tag}
            AND attempted_at IS NOT DISTINCT FROM ${before.attemptedAt}::timestamptz
          RETURNING id
        `.pipe(Effect.mapError(failed));

        return moved.length === 1;
      }
    );

    const claimCall = Effect.fn("ReviewStore.claimCall")(function* claimCall(
      replyId: string,
      at: DateTime.Utc
    ) {
      const claimed = yield* sql`
        UPDATE engagement.review_replies
        SET call_claimed_at = ${DateTime.formatIso(at)}::timestamptz
        WHERE id = ${replyId}::uuid AND status = 'sending'
        RETURNING id
      `.pipe(Effect.mapError(failed));

      return claimed.length === 1;
    });

    const strandedReplies = Effect.fn("ReviewStore.strandedReplies")(
      function* strandedReplies(
        writtenBefore: DateTime.Utc,
        calledBefore: DateTime.Utc,
        limit: number
      ) {
        const rows = yield* db
          .select()
          .from(reviewReplies)
          .where(
            and(
              eq(reviewReplies.status, "sending"),
              lte(reviewReplies.createdAt, date(writtenBefore)),
              or(
                isNull(reviewReplies.callClaimedAt),
                lte(reviewReplies.callClaimedAt, date(calledBefore))
              )
            )
          )
          .orderBy(asc(reviewReplies.createdAt), asc(reviewReplies.id))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(replyOf));
      }
    );

    const unconfirmedReplies = Effect.fn("ReviewStore.unconfirmedReplies")(
      function* unconfirmedReplies(settledBefore: DateTime.Utc, limit: number) {
        const rows = yield* db
          .select()
          .from(reviewReplies)
          .where(
            and(
              eq(reviewReplies.status, "unconfirmed"),
              lte(reviewReplies.settledAt, date(settledBefore))
            )
          )
          .orderBy(asc(reviewReplies.settledAt), asc(reviewReplies.id))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(replyOf));
      }
    );

    const channelGone = Effect.fn("ReviewStore.channelGone")(
      function* channelGone(channelId: string) {
        const deleted = yield* db
          .delete(reviewThreads)
          .where(eq(reviewThreads.channelId, channelId))
          .returning({ id: reviewThreads.id })
          .pipe(Effect.mapError(failed));

        return deleted.length;
      }
    );

    // Reviews past their time first, each thread they leave counted
    // again; then threads no read reached since, with what they hold.
    const purge = Effect.fn("ReviewStore.purge")(function* purge(
      keptSince: DateTime.Utc,
      limit: number
    ) {
      const since = DateTime.formatIso(keptSince);

      const gone = yield* sql<{ readonly threadId: string }>`
        DELETE FROM engagement.reviews
        WHERE id IN (
          SELECT id FROM engagement.reviews
          WHERE updated_at < ${since}::timestamptz
          ORDER BY updated_at
          LIMIT ${limit}
        )
        RETURNING thread_id AS "threadId"
      `.pipe(Effect.mapError(failed));

      yield* Effect.forEach(
        [...new Set(gone.map(({ threadId }) => threadId))],
        recount,
        { discard: true }
      );

      const threads = yield* sql`
        DELETE FROM engagement.review_threads
        WHERE id IN (
          SELECT id FROM engagement.review_threads
          WHERE COALESCE(last_read_at, created_at) < ${since}::timestamptz
          ORDER BY COALESCE(last_read_at, created_at)
          LIMIT ${limit}
        )
        RETURNING id
      `.pipe(Effect.mapError(failed));

      return { reviews: gone.length, threads: threads.length };
    });

    return ReviewStore.of({
      advanceReply,
      channelGone,
      claimCall,
      countDue,
      deleteReviews,
      due,
      follow,
      journalReply,
      listThreads,
      lockThread,
      purge,
      recount,
      repliesOf,
      repliesTo,
      reply,
      review,
      reviewsOf,
      saveReviews,
      saveThread,
      strandedReplies,
      thread,
      unconfirmedReplies,
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
