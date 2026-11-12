import { DateTime, Option, Schema } from "effect";
import type { Duration } from "effect";

import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

import { nextCollection, retryAfter } from "./collection-schedule.ts";
import { refreshDeadline } from "./engagement-retention.ts";
import { ThreadIdSchema } from "./thread-id.ts";
import type { ThreadId } from "./thread-id.ts";

/**
 * Why a post's comments are no longer read:
 *
 * - `window`: the post left the collection window.
 * - `disconnected`: its channel left the workspace.
 * - `unsupported`: Peal reads no comments on its platform.
 * - `missing`: the platform no longer shows the post.
 * - `removed`: Peal deleted the post from its platform at a member's
 *   request; the comments read until then are kept for their retention.
 */
export const CollectionEndSchema = Schema.Literals([
  "window",
  "disconnected",
  "unsupported",
  "missing",
  "removed",
]);

export type CollectionEnd = typeof CollectionEndSchema.Type;

/** Whether a thread is still read, and when next or why not. */
export const ThreadCollectionSchema = Schema.Union([
  Schema.TaggedStruct("collecting", { nextAt: Schema.DateTimeUtc }),
  Schema.TaggedStruct("ended", {
    at: Schema.DateTimeUtc,
    reason: CollectionEndSchema,
  }),
]);

export type ThreadCollection = typeof ThreadCollectionSchema.Type;

/**
 * The comments under one post that went live on one channel: where the
 * post is (the platform's id for it), when it went live, and when its
 * comments are read next. The thread holds ids and instants; what people
 * wrote is in its comments.
 */
export class Thread extends Schema.Class<Thread>(
  "peal-server/engagement/domain/Thread"
)({
  // The member who wrote the post, who hears of its comments; none for an
  // API key's post, or once their account is closed.
  authorId: Schema.Option(UserIdSchema),
  channelId: ChannelIdSchema,
  collection: ThreadCollectionSchema,
  id: ThreadIdSchema,
  // When its comments were read last; none before the first read.
  lastCollectedAt: Schema.Option(Schema.DateTimeUtc),
  permalink: Schema.Option(Schema.String),
  platformPostId: PlatformPostIdSchema,
  postId: PostIdSchema,
  publishedAt: Schema.DateTimeUtc,
  // When its comments must be read again or be forgotten, on a platform
  // that bounds how long Peal keeps what it gave without reading it
  // again; none elsewhere, and once the retention forgot them.
  refreshBy: Schema.Option(Schema.DateTimeUtc),
  targetId: PostTargetIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** A post that went live on a channel, as publishing lists it. */
export interface FollowedPost {
  readonly authorId: Thread["authorId"];
  readonly channelId: Thread["channelId"];
  readonly permalink: Option.Option<string>;
  readonly platformPostId: Thread["platformPostId"];
  readonly postId: Thread["postId"];
  readonly publishedAt: DateTime.Utc;
  readonly targetId: Thread["targetId"];
  readonly workspaceId: Thread["workspaceId"];
}

type Fields = ConstructorParameters<typeof Thread>[0];

const withFields = (thread: Thread, changed: Partial<Fields>): Thread =>
  new Thread({
    authorId: thread.authorId,
    channelId: thread.channelId,
    collection: thread.collection,
    id: thread.id,
    lastCollectedAt: thread.lastCollectedAt,
    permalink: thread.permalink,
    platformPostId: thread.platformPostId,
    postId: thread.postId,
    publishedAt: thread.publishedAt,
    refreshBy: thread.refreshBy,
    targetId: thread.targetId,
    workspaceId: thread.workspaceId,
    ...changed,
  });

/**
 * The thread of a post that just went live: read first on the next run,
 * since a post gets comments from its first minutes.
 */
export const followPost = (id: ThreadId, post: FollowedPost): Thread =>
  new Thread({
    authorId: post.authorId,
    channelId: post.channelId,
    collection: { _tag: "collecting", nextAt: post.publishedAt },
    id,
    lastCollectedAt: Option.none(),
    permalink: post.permalink,
    platformPostId: post.platformPostId,
    postId: post.postId,
    publishedAt: post.publishedAt,
    refreshBy: Option.none(),
    targetId: post.targetId,
    workspaceId: post.workspaceId,
  });

const scheduled = (
  thread: Thread,
  at: DateTime.Utc,
  window: Duration.Duration
): ThreadCollection =>
  Option.match(nextCollection(thread.publishedAt, at, window), {
    onNone: (): ThreadCollection => ({ _tag: "ended", at, reason: "window" }),
    onSome: (nextAt): ThreadCollection => ({ _tag: "collecting", nextAt }),
  });

/**
 * The thread once the run scheduled at `at` read its comments, at
 * `collectedAt`: its next read follows the schedule, or it ends with the
 * window. On a platform that bounds how long Peal keeps a comment without
 * reading it again (`refreshWithin`), only a `complete` read, which saw
 * every comment the thread keeps, moves the bound: an incomplete one (a
 * cap, a deadline, comments turned off) never extends it, so a comment it
 * did not return is forgotten at the bound. An incomplete read sets one
 * only where the thread had none.
 */
export const recordCollection = (
  thread: Thread,
  collectedAt: DateTime.Utc,
  at: DateTime.Utc,
  window: Duration.Duration,
  refreshWithin: Option.Option<Duration.Duration>,
  complete: boolean
): Thread => {
  const deadline = refreshDeadline(collectedAt, refreshWithin);

  return withFields(thread, {
    collection: scheduled(thread, at, window),
    lastCollectedAt: Option.some(collectedAt),
    refreshBy:
      complete || Option.isNone(refreshWithin)
        ? deadline
        : Option.orElse(thread.refreshBy, () => deadline),
  });
};

/**
 * The thread once the run scheduled at `at` could not read it for now (its
 * platform down or asking to slow down, its channel off): it waits half an
 * hour, or its schedule's next turn when that comes later, and ends with
 * the window like any other.
 */
export const postponeCollection = (
  thread: Thread,
  at: DateTime.Utc,
  window: Duration.Duration
): Thread => {
  const next = scheduled(thread, at, window);

  if (next._tag === "ended") {
    return withFields(thread, { collection: next });
  }

  const retryAt = DateTime.addDuration(at, retryAfter);

  return withFields(thread, {
    collection: {
      _tag: "collecting",
      nextAt: DateTime.max(next.nextAt, retryAt),
    },
  });
};

/**
 * The thread once the retention forgot what its last read found: nothing
 * of it waits for a refresh any more.
 */
export const withoutRefresh = (thread: Thread): Thread =>
  withFields(thread, { refreshBy: Option.none() });

/** The thread, read no more. */
export const endCollection = (
  thread: Thread,
  reason: CollectionEnd,
  at: DateTime.Utc
): Thread => withFields(thread, { collection: { _tag: "ended", at, reason } });

/** Whether the thread's comments are still read. */
export const isCollecting = (thread: Thread): boolean =>
  thread.collection._tag === "collecting";
