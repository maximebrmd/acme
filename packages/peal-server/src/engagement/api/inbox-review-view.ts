import { DateTime, Option, Schema } from "effect";
import type {
  InboxReview,
  InboxReviewAbilities,
  InboxReviewReply,
  InboxReviewThread,
  InboxReviewThreadDetail,
  InboxReviewThreadPage,
} from "peal-contract";

import type {
  ReviewThreadDetail,
  ReviewThreadsPage,
} from "#engagement/application/engagement-reviews.ts";
import type {
  ReviewThreadCursor,
  ReviewThreadSummary,
} from "#engagement/application/ports/review-store.ts";
import type { ReviewAbilities } from "#engagement/domain/review-abilities.ts";
import type { ReviewReply } from "#engagement/domain/review-reply.ts";
import { ReviewThreadIdSchema } from "#engagement/domain/review-thread-id.ts";
import { isReviewAnswered } from "#engagement/domain/review.ts";
import type { Review } from "#engagement/domain/review.ts";

// What the API and the MCP tools answer about the reviews of locations.

export const toReviewAbilitiesView = (
  abilities: ReviewAbilities
): InboxReviewAbilities => ({ ...abilities });

export const toReviewView = (review: Review): InboxReview => ({
  id: review.id,
  markedAnswered: Option.isSome(review.answeredAt),
  photos: review.photoCount,
  rating: review.rating,
  receivedAt: review.receivedAt,
  reply: review.reply.pipe(
    Option.map(({ moderation, text, updatedAt }) => ({
      moderation: Option.getOrNull(moderation),
      text,
      updatedAt,
    })),
    Option.getOrNull
  ),
  reviewerName: Option.getOrNull(review.reviewerName),
  state: isReviewAnswered(review) ? "answered" : "new",
  text: review.text,
  threadId: review.threadId,
  updatedAt: review.updatedAt,
  writtenAt: review.writtenAt,
});

export const toReviewReplyView = (reply: ReviewReply): InboxReviewReply => {
  const { status } = reply;

  return {
    authorId: Option.getOrNull(reply.authorId),
    createdAt: reply.createdAt,
    id: reply.id,
    reason:
      status._tag === "failed" || status._tag === "unconfirmed"
        ? status.reason
        : null,
    reviewId: reply.reviewId,
    settledAt: status._tag === "sending" ? null : status.at,
    status: status._tag,
    text: reply.text,
    threadId: reply.threadId,
  };
};

export const toReviewThreadView = (
  summary: ReviewThreadSummary
): InboxReviewThread => {
  const { thread } = summary;

  return {
    averageRating: Option.getOrNull(thread.averageRating),
    channelId: thread.channelId,
    id: thread.id,
    kind: "reviews",
    lastCollectedAt: Option.getOrNull(thread.lastReadAt),
    lastReviewAt: Option.getOrNull(summary.lastReviewAt),
    reviews: summary.reviews,
    totalReviewCount: Option.getOrNull(thread.totalReviewCount),
    unanswered: summary.unanswered,
  };
};

// A cursor is where a page ended, as text: whether the location had
// reviews waiting, its latest review's instant, and its thread's id.
const encodeCursor = (cursor: ReviewThreadCursor): string =>
  [
    cursor.waiting ? "1" : "0",
    DateTime.toEpochMillis(cursor.lastReviewAt),
    cursor.threadId,
  ].join("_");

const decodeThreadId = Schema.decodeUnknownOption(ReviewThreadIdSchema);

// The last millisecond of the year 9999: past it, an instant has no ISO
// text the database reads.
const latestInstant = 253_402_300_799_999;

const instantOf = (millis: string): Option.Option<DateTime.Utc> =>
  /^\d{1,15}$/u.test(millis) && Number(millis) <= latestInstant
    ? DateTime.make(Number(millis))
    : Option.none();

/** The cursor a client sent back, if it is one this server made. */
export const reviewCursorOf = (
  text: string
): Option.Option<ReviewThreadCursor> => {
  const [waiting = "", millis = "", id = ""] = text.split("_");

  if (waiting !== "0" && waiting !== "1") {
    return Option.none();
  }

  return Option.all({
    lastReviewAt: instantOf(millis),
    threadId: decodeThreadId(id),
  }).pipe(Option.map((found) => ({ ...found, waiting: waiting === "1" })));
};

export const toReviewThreadPageView = (
  page: ReviewThreadsPage
): InboxReviewThreadPage => ({
  items: page.threads.map(toReviewThreadView),
  nextCursor: page.next.pipe(Option.map(encodeCursor), Option.getOrNull),
});

export const toReviewThreadDetailView = (
  detail: ReviewThreadDetail
): InboxReviewThreadDetail => ({
  abilities: toReviewAbilitiesView(detail.abilities),
  platform: Option.getOrNull(detail.platform),
  replies: detail.replies.map(toReviewReplyView),
  reviews: detail.reviews.map(toReviewView),
  thread: toReviewThreadView(detail.summary),
});
