import { DateTime, Duration, Option, Schema } from "effect";

import {
  ChannelIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { ChannelSetIdSchema } from "./channel-set-id.ts";
import type { ChannelSetId } from "./channel-set-id.ts";
import { FeedAddressSchema } from "./feed-address.ts";
import type { FeedAddress } from "./feed-address.ts";
import { FeedIdSchema } from "./feed-id.ts";
import type { FeedId } from "./feed-id.ts";
import { FeedReadFailureSchema } from "./feed-read-failure.ts";
import type { FeedReadFailure } from "./feed-read-failure.ts";
import { FeedStopReasonSchema } from "./feed-stop-reason.ts";
import type { FeedStopReason } from "./feed-stop-reason.ts";
import { PostOriginSchema } from "./post-origin.ts";
import type { PostOrigin } from "./post-origin.ts";
import { QueueIdSchema } from "./queue-id.ts";
import type { QueueId } from "./queue-id.ts";

// The limits below are the owner's to change: each is written once here,
// and the contract's copy is kept equal by a test.

/** The most feeds a workspace follows, whatever its plan. */
export const maxFeedsPerWorkspace = 10;

/** The most posts one feed makes in one run. */
export const maxItemsPerRun = 3;

/** The most posts one feed makes in a UTC day. */
export const maxItemsPerDay = 12;

/** How often a feed is read, plus up to `checkSpread`. */
export const feedCheckInterval = Duration.hours(1);

/** The most bytes Peal reads of a feed: 2 MiB. */
export const maxFeedBytes = 2 * 1024 * 1024;

/** The longest summary an item gives a post, in characters. */
export const maxSummaryLength = 280;

/** The longest title an item or a feed keeps, in characters. */
export const maxFeedTitleLength = 300;

/** How many days a feed may fail before it stops. */
export const maxFailingDays = 7;

/** How many items of a document are read, the first ones it lists. */
export const maxItemsRead = 500;

/** How many reads of a host a member chose a workspace makes an hour. */
export const feedReadsPerHour = 30;

// How far feeds' checks spread past the interval, so feeds added
// together are not all read together.
const checkSpread = Duration.minutes(10);

// The longest and shortest a failing feed waits before it is read again.
const shortestWait = Duration.hours(1);
const longestWait = Duration.days(1);
const shortestHostWait = Duration.minutes(10);

/** How a feed's items become posts: drafts, or posts on a queue. */
export const FeedModeSchema = Schema.Literals(["draft", "queue"]);

export type FeedMode = typeof FeedModeSchema.Type;

/** Where a feed is: read and made posts from, paused, or stopped. */
export const FeedStatusSchema = Schema.Union([
  Schema.TaggedStruct("active", {}),
  Schema.TaggedStruct("paused", { pausedAt: Schema.DateTimeUtc }),
  Schema.TaggedStruct("stopped", {
    reason: FeedStopReasonSchema,
    stoppedAt: Schema.DateTimeUtc,
  }),
]);

export type FeedStatus = typeof FeedStatusSchema.Type;

/**
 * What the last read of a feed gave its host to compare with (RFC 9110,
 * 13.1.2 and 13.1.3), sent back so an unchanged feed answers 304.
 */
export interface FeedValidators {
  readonly etag: Option.Option<string>;
  readonly lastModified: Option.Option<string>;
}

/**
 * A web feed a workspace follows (`#publishing/application/feeds.ts`):
 * read every `feedCheckInterval`, each item it had not held before
 * becomes a draft (`draft`) or a post on a queue's next free slot
 * (`queue`: the queue named, or the workspace's default), for its
 * channels and its channel set, as its template writes it.
 *
 * Only items that appear once it was added, or its address last changed,
 * become posts: `since` is when, and an item dated before it is not
 * made. It acts as whoever started it (`startedBy`, `startedVia`, as a
 * recycling rule does). It keeps the validators of its last read, when it
 * was last read and is next, and since when it fails (`failingSince`,
 * with the code of the last failure).
 */
export class Feed extends Schema.Class<Feed>(
  "peal-server/publishing/domain/Feed"
)({
  attachPicture: Schema.Boolean,
  channelIds: Schema.Array(ChannelIdSchema),
  channelSetId: Schema.Option(ChannelSetIdSchema),
  createdAt: Schema.DateTimeUtc,
  etag: Schema.Option(Schema.String),
  failingSince: Schema.Option(Schema.DateTimeUtc),
  id: FeedIdSchema,
  lastCheckedAt: Schema.Option(Schema.DateTimeUtc),
  lastFailure: Schema.Option(FeedReadFailureSchema),
  lastModified: Schema.Option(Schema.String),
  mode: FeedModeSchema,
  nextCheckAt: Schema.DateTimeUtc,
  queueId: Schema.Option(QueueIdSchema),
  since: Schema.DateTimeUtc,
  startedBy: Schema.Option(UserIdSchema),
  startedVia: PostOriginSchema,
  status: FeedStatusSchema,
  template: Schema.String,
  title: Schema.Option(Schema.String),
  updatedAt: Schema.DateTimeUtc,
  url: FeedAddressSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type FeedFields = ConstructorParameters<typeof Feed>[0];

const changed = (feed: Feed, fields: Partial<FeedFields>): Feed => {
  const current: FeedFields = {
    attachPicture: feed.attachPicture,
    channelIds: feed.channelIds,
    channelSetId: feed.channelSetId,
    createdAt: feed.createdAt,
    etag: feed.etag,
    failingSince: feed.failingSince,
    id: feed.id,
    lastCheckedAt: feed.lastCheckedAt,
    lastFailure: feed.lastFailure,
    lastModified: feed.lastModified,
    mode: feed.mode,
    nextCheckAt: feed.nextCheckAt,
    queueId: feed.queueId,
    since: feed.since,
    startedBy: feed.startedBy,
    startedVia: feed.startedVia,
    status: feed.status,
    template: feed.template,
    title: feed.title,
    updatedAt: feed.updatedAt,
    url: feed.url,
    workspaceId: feed.workspaceId,
  };

  return new Feed({ ...current, ...fields });
};

// Up to `checkSpread`, the same for a feed every time: from the end of
// its id, which is random in a UUIDv7.
const spreadOf = (id: FeedId): Duration.Duration => {
  const tail = Number.parseInt(id.replaceAll("-", "").slice(-8), 16);

  return Duration.millis(
    (Number.isFinite(tail) ? tail : 0) % Duration.toMillis(checkSpread)
  );
};

/** When a feed read at `now` is read next. */
export const nextCheckAfter = (id: FeedId, now: DateTime.Utc): DateTime.Utc =>
  DateTime.addDuration(
    DateTime.addDuration(now, feedCheckInterval),
    spreadOf(id)
  );

/** What starts a feed. */
export interface NewFeed {
  readonly attachPicture: boolean;
  readonly channelIds: readonly ChannelId[];
  readonly channelSetId: Option.Option<ChannelSetId>;
  readonly id: FeedId;
  readonly mode: FeedMode;
  readonly queueId: Option.Option<QueueId>;
  readonly startedBy: Option.Option<UserId>;
  readonly startedVia: PostOrigin;
  readonly template: string;
  readonly title: Option.Option<string>;
  readonly url: FeedAddress;
  readonly validators: FeedValidators;
  readonly workspaceId: WorkspaceId;
}

/** A new feed, read at `now`: what it holds then is never made. */
export const startFeed = (feed: NewFeed, now: DateTime.Utc): Feed =>
  new Feed({
    attachPicture: feed.attachPicture,
    channelIds: feed.channelIds,
    channelSetId: feed.channelSetId,
    createdAt: now,
    etag: feed.validators.etag,
    failingSince: Option.none(),
    id: feed.id,
    lastCheckedAt: Option.some(now),
    lastFailure: Option.none(),
    lastModified: feed.validators.lastModified,
    mode: feed.mode,
    nextCheckAt: nextCheckAfter(feed.id, now),
    queueId: feed.queueId,
    since: now,
    startedBy: feed.startedBy,
    startedVia: feed.startedVia,
    status: { _tag: "active" },
    template: feed.template,
    title: feed.title,
    updatedAt: now,
    url: feed.url,
    workspaceId: feed.workspaceId,
  });

/** Whether the feed is to be read now. */
export const isDue = (feed: Feed, now: DateTime.Utc): boolean =>
  feed.status._tag === "active" &&
  !DateTime.isGreaterThan(feed.nextCheckAt, now);

/**
 * The feed after a read that gave it, or told that nothing changed
 * (`validators` none then, the old ones kept): no longer failing, read
 * again one interval on.
 */
export const readSucceeded = (
  feed: Feed,
  now: DateTime.Utc,
  read: Option.Option<{
    readonly title: Option.Option<string>;
    readonly validators: FeedValidators;
  }>
): Feed =>
  changed(feed, {
    ...Option.match(read, {
      onNone: () => ({}),
      onSome: ({ title, validators }) => ({
        etag: validators.etag,
        lastModified: validators.lastModified,
        title: Option.orElse(title, () => feed.title),
      }),
    }),
    failingSince: Option.none(),
    lastCheckedAt: Option.some(now),
    lastFailure: Option.none(),
    nextCheckAt: nextCheckAfter(feed.id, now),
    updatedAt: now,
  });

// What a feed that failed so long stops as.
const stopReasonOf = (failure: FeedReadFailure): FeedStopReason =>
  failure === "notAFeed" || failure === "tooLarge" ? "notAFeed" : "unreachable";

/** Stops a feed: one stopped already stays as it stopped. */
export const stopFeed = (
  feed: Feed,
  reason: FeedStopReason,
  now: DateTime.Utc
): Feed =>
  feed.status._tag === "stopped"
    ? feed
    : changed(feed, {
        status: { _tag: "stopped", reason, stoppedAt: now },
        updatedAt: now,
      });

/**
 * The feed after a read that failed: postponed, the host's wait when it
 * asked for one (ten minutes to a day), else as long as it has been
 * failing (an hour at first, then about doubling, a day at most); stopped
 * at once when its host says it is gone, and once it has failed for
 * `maxFailingDays`.
 */
export const readFailed = (
  feed: Feed,
  failure: FeedReadFailure,
  hostWait: Option.Option<Duration.Duration>,
  now: DateTime.Utc
): Feed => {
  const failingSince = Option.getOrElse(feed.failingSince, () => now);

  const failing = changed(feed, {
    failingSince: Option.some(failingSince),
    lastCheckedAt: Option.some(now),
    lastFailure: Option.some(failure),
    updatedAt: now,
  });

  if (failure === "gone") {
    return stopFeed(failing, "gone", now);
  }

  const failedFor = DateTime.distance(failingSince, now);

  if (
    Duration.isGreaterThanOrEqualTo(failedFor, Duration.days(maxFailingDays))
  ) {
    return stopFeed(failing, stopReasonOf(failure), now);
  }

  const wait = Option.match(hostWait, {
    onNone: () =>
      Duration.clamp(failedFor, {
        maximum: longestWait,
        minimum: shortestWait,
      }),
    onSome: (asked) =>
      Duration.clamp(asked, {
        maximum: longestWait,
        minimum: shortestHostWait,
      }),
  });

  return changed(failing, {
    nextCheckAt: DateTime.addDuration(now, wait),
  });
};

/**
 * The feed held by a run until `until`: no other run takes it before,
 * and one that died gives it back then.
 */
export const leaseFeed = (feed: Feed, until: DateTime.Utc): Feed =>
  changed(feed, { nextCheckAt: until });

/** Pauses a feed that is not stopped; a paused one stays so. */
export const pauseFeed = (feed: Feed, now: DateTime.Utc): Feed =>
  feed.status._tag === "active"
    ? changed(feed, {
        status: { _tag: "paused", pausedAt: now },
        updatedAt: now,
      })
    : feed;

/**
 * A feed set going again, paused or stopped, as read at `now`: what it
 * holds then is never made, and it is no longer failing.
 */
export const resumeFeed = (
  feed: Feed,
  now: DateTime.Utc,
  read: {
    readonly title: Option.Option<string>;
    readonly validators: FeedValidators;
  }
): Feed =>
  changed(readSucceeded(feed, now, Option.some(read)), {
    since: now,
    status: { _tag: "active" },
  });

/**
 * The feed taken over by whoever resumes it once its starter is gone: its
 * posts act as them from then on.
 */
export const adoptFeed = (
  feed: Feed,
  startedBy: Option.Option<UserId>,
  startedVia: PostOrigin
): Feed => changed(feed, { startedBy, startedVia });

/** What a member changes of a feed: each left out stays as it is. */
export interface FeedChange {
  readonly attachPicture?: boolean | undefined;
  readonly channelIds?: readonly ChannelId[] | undefined;
  readonly channelSetId?: Option.Option<ChannelSetId> | undefined;
  readonly mode?: FeedMode | undefined;
  readonly queueId?: Option.Option<QueueId> | undefined;
  readonly template?: string | undefined;
}

/** The feed with what a member changed of it. */
export const editFeed = (
  feed: Feed,
  change: FeedChange,
  now: DateTime.Utc
): Feed =>
  changed(feed, {
    attachPicture: change.attachPicture ?? feed.attachPicture,
    channelIds: change.channelIds ?? feed.channelIds,
    channelSetId: change.channelSetId ?? feed.channelSetId,
    mode: change.mode ?? feed.mode,
    queueId: change.queueId ?? feed.queueId,
    template: change.template ?? feed.template,
    updatedAt: now,
  });

/**
 * The feed at a new address, as read at `now`: what it holds then is
 * never made, and its validators and failures are the new address's.
 */
export const moveFeed = (
  feed: Feed,
  url: FeedAddress,
  now: DateTime.Utc,
  read: {
    readonly title: Option.Option<string>;
    readonly validators: FeedValidators;
  }
): Feed =>
  changed(readSucceeded(feed, now, Option.some(read)), {
    since: now,
    title: read.title,
    url,
  });
