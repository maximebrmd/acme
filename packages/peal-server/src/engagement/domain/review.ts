import { DateTime, Duration, Option, Schema } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { storableLine, storableText } from "#shared/domain/platform-text.ts";

import { ReviewIdSchema } from "./review-id.ts";
import type { ReviewId } from "./review-id.ts";
import { ReviewThreadIdSchema } from "./review-thread-id.ts";
import type { ReviewThread } from "./review-thread.ts";

/**
 * How long after it was written, or last changed, a review is kept:
 * Google's Business Profile API policies
 * (developers.google.com/my-business/content/policies, read 2026-11-14)
 * let what the API gives be stored "temporarily for no more than 30
 * calendar days". Peal keeps a review 29 days from its own `updateTime`,
 * which no read can come before, so no version of a review is held 30
 * days, whatever read stored it first; the day left covers the hourly
 * sweep. A review changed since is read again, and kept from its change.
 */
export const reviewsKeptFor = Duration.days(29);

/** The longest review Peal keeps: what is past it is cut. */
export const maxReviewLength = 10_000;

/** The longest name Peal keeps of a reviewer. */
export const maxReviewerNameLength = 200;

/** The longest reply Peal keeps as the platform gave it. */
export const maxOwnerReplyLength = 10_000;

/**
 * A review's name on Google: `accounts/…/locations/…/reviews/…`, the
 * address its reply is put at.
 */
export const PlatformReviewIdSchema = Schema.NonEmptyString.check(
  Schema.isMaxLength(512)
);

/** Stars, from one to five. */
export const ReviewRatingSchema = Schema.Int.check(
  Schema.isBetween({ maximum: 5, minimum: 1 })
);

export type ReviewRating = typeof ReviewRatingSchema.Type;

/**
 * Where the platform's moderation has the location's reply: Google holds
 * a reply `pending` until it checked it, then `approved` or `rejected`.
 */
export const OwnerReplyModerationSchema = Schema.Literals([
  "pending",
  "approved",
  "rejected",
]);

export type OwnerReplyModeration = typeof OwnerReplyModerationSchema.Type;

/**
 * The location's reply to a review, as the platform shows it: the one a
 * review holds, whoever wrote it, from Peal or on the platform.
 */
export const OwnerReplySchema = Schema.Struct({
  // None when the platform does not say.
  moderation: Schema.Option(OwnerReplyModerationSchema),
  text: Schema.String,
  updatedAt: Schema.DateTimeUtc,
});

export type OwnerReply = typeof OwnerReplySchema.Type;

/**
 * A review someone left on a location, as its platform gave it: its
 * rating, its text, the name its author shows (none when they chose to
 * stay anonymous), how many photos it holds (never the photos), and the
 * location's reply. It is that person's, not the workspace's: Peal shows
 * it and lets members answer it, and uses it for nothing else.
 */
export class Review extends Schema.Class<Review>(
  "peal-server/engagement/domain/Review"
)({
  // When a member said it needs no answer; none otherwise.
  answeredAt: Schema.Option(Schema.DateTimeUtc),
  channelId: ChannelIdSchema,
  id: ReviewIdSchema,
  photoCount: Schema.Int,
  platformReviewId: PlatformReviewIdSchema,
  rating: ReviewRatingSchema,
  // When Peal first read it.
  receivedAt: Schema.DateTimeUtc,
  reply: Schema.Option(OwnerReplySchema),
  reviewerName: Schema.Option(Schema.String),
  // Plain text; empty for a rating without words.
  text: Schema.String,
  threadId: ReviewThreadIdSchema,
  // When its author last changed it, as the platform says.
  updatedAt: Schema.DateTimeUtc,
  workspaceId: WorkspaceIdSchema,
  // When its author wrote it, as the platform says.
  writtenAt: Schema.DateTimeUtc,
}) {}

/** A review as a read of its platform found it. */
export const ReviewReadingSchema = Schema.Struct({
  photoCount: Schema.Int,
  platformReviewId: PlatformReviewIdSchema,
  rating: ReviewRatingSchema,
  reply: Schema.Option(OwnerReplySchema),
  reviewerName: Schema.Option(Schema.String),
  text: Schema.String,
  updatedAt: Schema.DateTimeUtc,
  writtenAt: Schema.DateTimeUtc,
});

export type ReviewReading = typeof ReviewReadingSchema.Type;

type Fields = ConstructorParameters<typeof Review>[0];

const withFields = (review: Review, changed: Partial<Fields>): Review =>
  new Review({
    answeredAt: review.answeredAt,
    channelId: review.channelId,
    id: review.id,
    photoCount: review.photoCount,
    platformReviewId: review.platformReviewId,
    rating: review.rating,
    receivedAt: review.receivedAt,
    reply: review.reply,
    reviewerName: review.reviewerName,
    text: review.text,
    threadId: review.threadId,
    updatedAt: review.updatedAt,
    workspaceId: review.workspaceId,
    writtenAt: review.writtenAt,
    ...changed,
  });

/**
 * A reading as it can be kept: well formed and bounded text, a name on
 * one line (none when nothing is left of it), the reply's text likewise,
 * and no negative count.
 */
export const storableReview = (reading: ReviewReading): ReviewReading => ({
  ...reading,
  photoCount: Math.max(0, Math.trunc(reading.photoCount)),
  reply: reading.reply.pipe(
    Option.map((reply) => ({
      ...reply,
      text: storableText(reply.text, maxOwnerReplyLength),
    }))
  ),
  reviewerName: reading.reviewerName.pipe(
    Option.map((name) => storableLine(name, maxReviewerNameLength)),
    Option.filter((name) => name !== "")
  ),
  text: storableText(reading.text, maxReviewLength),
});

/** The review a first read found, kept as of `now`. */
export const receiveReview = (
  id: ReviewId,
  thread: Pick<ReviewThread, "channelId" | "id" | "workspaceId">,
  read: ReviewReading,
  now: DateTime.Utc
): Review => {
  const reading = storableReview(read);

  return new Review({
    answeredAt: Option.none(),
    channelId: thread.channelId,
    id,
    photoCount: reading.photoCount,
    platformReviewId: reading.platformReviewId,
    rating: reading.rating,
    receivedAt: now,
    reply: reading.reply,
    reviewerName: reading.reviewerName,
    text: reading.text,
    threadId: thread.id,
    updatedAt: reading.updatedAt,
    workspaceId: thread.workspaceId,
    writtenAt: reading.writtenAt,
  });
};

/** The review as a later read found it: what Peal decided stays. */
export const refreshReview = (review: Review, read: ReviewReading): Review => {
  const reading = storableReview(read);

  return withFields(review, {
    photoCount: reading.photoCount,
    rating: reading.rating,
    reply: reading.reply,
    reviewerName: reading.reviewerName,
    text: reading.text,
    updatedAt: reading.updatedAt,
    writtenAt: reading.writtenAt,
  });
};

/** The review with the location's reply as it stands now. */
export const withOwnerReply = (
  review: Review,
  reply: Option.Option<OwnerReply>
): Review => withFields(review, { reply });

/** The review once a member said it needs no answer, or waits for one. */
export const markReviewAnswered = (
  review: Review,
  answered: boolean,
  now: DateTime.Utc
): Review =>
  withFields(review, {
    answeredAt: answered
      ? Option.orElse(review.answeredAt, () => Option.some(now))
      : Option.none(),
  });

/**
 * Whether the review waits for no answer: the location replied, or a
 * member said it needs none.
 */
export const isReviewAnswered = (review: Review): boolean =>
  Option.isSome(review.reply) || Option.isSome(review.answeredAt);

/** The instant before which a review is no longer kept, at `now`. */
export const keptSince = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtractDuration(now, reviewsKeptFor);

/** Whether a review last changed at `updatedAt` is still kept at `now`. */
export const isKept = (updatedAt: DateTime.Utc, now: DateTime.Utc): boolean =>
  DateTime.isGreaterThanOrEqualTo(updatedAt, keptSince(now));

/** What a read changes in a thread's reviews. */
export interface ReviewsReconciled {
  /** Reviews read for the first time, still to be given an id. */
  readonly fresh: readonly ReviewReading[];
  /** Reviews kept before, as this read found them. */
  readonly refreshed: readonly Review[];
  /**
   * Reviews kept before that the platform no longer shows, or past the
   * time they may be kept: deleted, with nothing left of them.
   */
  readonly gone: readonly ReviewId[];
}

/**
 * The one place that decides what a read changes. A review past
 * `reviewsKeptFor` is neither taken nor kept. Only a `complete` read, one
 * that listed every review the location shows from the oldest one kept
 * on, may take a review it did not see for gone; any read refreshes what
 * it saw.
 */
export const reconcileReviews = (
  kept: readonly Review[],
  read: readonly ReviewReading[],
  complete: boolean,
  now: DateTime.Utc
): ReviewsReconciled => {
  const readings = new Map<string, ReviewReading>();

  for (const raw of read) {
    const reading = storableReview(raw);

    if (isKept(reading.updatedAt, now)) {
      readings.set(reading.platformReviewId, reading);
    }
  }

  const known = new Set(kept.map((review) => review.platformReviewId));
  const refreshed: Review[] = [];
  const gone: ReviewId[] = [];

  for (const review of kept) {
    const reading = readings.get(review.platformReviewId);

    if (reading !== undefined) {
      refreshed.push(refreshReview(review, reading));
    } else if (complete || !isKept(review.updatedAt, now)) {
      gone.push(review.id);
    }
  }

  return {
    fresh: [...readings.values()].filter(
      (reading) => !known.has(reading.platformReviewId)
    ),
    gone,
    refreshed,
  };
};
