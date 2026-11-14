import { DateTime, Duration, Option, Schema } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

import { ReviewThreadIdSchema } from "./review-thread-id.ts";
import type { ReviewThreadId } from "./review-thread-id.ts";

/**
 * How often a location's reviews are read: they come slowly, so every
 * hour while the location had one written or changed in the last week,
 * every six hours otherwise. The collection runs hourly; each read
 * schedules the next from the run it happened in.
 */
export const reviewsHourlyFor = Duration.days(7);

const hourly = Duration.hours(1);

const sixHourly = Duration.hours(6);

/**
 * The reviews of one location, the account a Google Business Profile
 * channel posts as: one thread a channel. It holds when its reviews are
 * read next, when they were last, and what the platform says of the
 * location as a whole (its average rating and how many reviews it has,
 * none before the first read).
 */
export class ReviewThread extends Schema.Class<ReviewThread>(
  "peal-server/engagement/domain/ReviewThread"
)({
  averageRating: Schema.Option(Schema.Number),
  channelId: ChannelIdSchema,
  createdAt: Schema.DateTimeUtc,
  id: ReviewThreadIdSchema,
  lastReadAt: Schema.Option(Schema.DateTimeUtc),
  nextReadAt: Schema.DateTimeUtc,
  totalReviewCount: Schema.Option(Schema.Int),
  workspaceId: WorkspaceIdSchema,
}) {}

type Fields = ConstructorParameters<typeof ReviewThread>[0];

const withFields = (
  thread: ReviewThread,
  changed: Partial<Fields>
): ReviewThread =>
  new ReviewThread({
    averageRating: thread.averageRating,
    channelId: thread.channelId,
    createdAt: thread.createdAt,
    id: thread.id,
    lastReadAt: thread.lastReadAt,
    nextReadAt: thread.nextReadAt,
    totalReviewCount: thread.totalReviewCount,
    workspaceId: thread.workspaceId,
    ...changed,
  });

/** A location to follow, from its channel: read at the next run. */
export const followLocation = (
  id: ReviewThreadId,
  channel: { readonly channelId: ChannelId; readonly workspaceId: WorkspaceId },
  now: DateTime.Utc
): ReviewThread =>
  new ReviewThread({
    averageRating: Option.none(),
    channelId: channel.channelId,
    createdAt: now,
    id,
    lastReadAt: Option.none(),
    nextReadAt: now,
    totalReviewCount: Option.none(),
    workspaceId: channel.workspaceId,
  });

/**
 * When to read a location next after the run `at`: an hour later while a
 * review was written or changed in the last week (`latest`), six hours
 * later otherwise.
 */
export const nextReviewRead = (
  latest: Option.Option<DateTime.Utc>,
  at: DateTime.Utc
): DateTime.Utc => {
  const recent = Option.exists(latest, (updatedAt) =>
    DateTime.isGreaterThan(
      updatedAt,
      DateTime.subtractDuration(at, reviewsHourlyFor)
    )
  );

  return DateTime.addDuration(at, recent ? hourly : sixHourly);
};

/** What a read says of the location as a whole. */
export interface LocationFigures {
  readonly averageRating: Option.Option<number>;
  readonly totalReviewCount: Option.Option<number>;
}

/**
 * The thread once the run `at` read it at `readAt`, with the location's
 * figures and the latest review it keeps.
 */
export const recordReviewRead = (
  thread: ReviewThread,
  figures: LocationFigures,
  latest: Option.Option<DateTime.Utc>,
  readAt: DateTime.Utc,
  at: DateTime.Utc
): ReviewThread =>
  withFields(thread, {
    averageRating: figures.averageRating,
    lastReadAt: Option.some(readAt),
    nextReadAt: nextReviewRead(latest, at),
    totalReviewCount: figures.totalReviewCount,
  });

/**
 * The thread once the run `at` could not read it (the platform down or
 * asking to slow down, the channel paused, the inbox not reading the
 * platform): it waits `wait`.
 */
export const postponeReviewRead = (
  thread: ReviewThread,
  at: DateTime.Utc,
  wait: Duration.Duration
): ReviewThread =>
  withFields(thread, { nextReadAt: DateTime.addDuration(at, wait) });
