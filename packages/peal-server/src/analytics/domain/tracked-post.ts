import { Option, Schema } from "effect";
import type { DateTime } from "effect";

import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

import { firstCollection, nextCollection } from "./collection-schedule.ts";
import { PostMetrics } from "./post-metrics.ts";

/**
 * Why a post is no longer read:
 *
 * - `window`: it is 30 days old, and its counts move no more.
 * - `disconnected`: its channel left the workspace.
 * - `unsupported`: Peal cannot read counts on its platform.
 */
export const CollectionEndSchema = Schema.Literals([
  "window",
  "disconnected",
  "unsupported",
]);

export type CollectionEnd = typeof CollectionEndSchema.Type;

/** Whether a post is still read, and when next or why not. */
export const CollectionSchema = Schema.Union([
  Schema.TaggedStruct("collecting", { nextAt: Schema.DateTimeUtc }),
  Schema.TaggedStruct("ended", {
    at: Schema.DateTimeUtc,
    reason: CollectionEndSchema,
  }),
]);

export type Collection = typeof CollectionSchema.Type;

/**
 * A post that went live on a channel, whose counts analytics reads back
 * from the platform: where it is (the platform's id for it), when it went
 * live, the counts read last, and when it is read next.
 */
export class TrackedPost extends Schema.Class<TrackedPost>(
  "peal-server/analytics/domain/TrackedPost"
)({
  channelId: ChannelIdSchema,
  collection: CollectionSchema,
  // The counts read last, and when; none before the first read.
  lastCollectedAt: Schema.Option(Schema.DateTimeUtc),
  latest: Schema.Option(PostMetrics),
  permalink: Schema.Option(Schema.String),
  platformPostId: PlatformPostIdSchema,
  postId: PostIdSchema,
  publishedAt: Schema.DateTimeUtc,
  targetId: PostTargetIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** What publishing tells about a post that went live on a channel. */
export type Publication = Pick<
  TrackedPost,
  | "channelId"
  | "permalink"
  | "platformPostId"
  | "postId"
  | "publishedAt"
  | "targetId"
  | "workspaceId"
>;

/** A post analytics starts following, to be read on the next run. */
export const trackPublication = (publication: Publication): TrackedPost =>
  new TrackedPost({
    ...publication,
    collection: {
      _tag: "collecting",
      nextAt: firstCollection(publication.publishedAt),
    },
    lastCollectedAt: Option.none(),
    latest: Option.none(),
  });

const withCollection = (
  post: TrackedPost,
  collection: Collection,
  reading: Pick<TrackedPost, "lastCollectedAt" | "latest"> = post
): TrackedPost =>
  new TrackedPost({
    channelId: post.channelId,
    collection,
    lastCollectedAt: reading.lastCollectedAt,
    latest: reading.latest,
    permalink: post.permalink,
    platformPostId: post.platformPostId,
    postId: post.postId,
    publishedAt: post.publishedAt,
    targetId: post.targetId,
    workspaceId: post.workspaceId,
  });

// After the run `at`: read again on schedule, or no more.
const scheduledAfter = (post: TrackedPost, at: DateTime.Utc): Collection =>
  Option.match(nextCollection(post.publishedAt, at), {
    onNone: (): Collection => ({ _tag: "ended", at, reason: "window" }),
    onSome: (nextAt): Collection => ({ _tag: "collecting", nextAt }),
  });

/**
 * The post once the run `at` read its counts, at `collectedAt`: those are
 * its latest, and it is read again on schedule.
 */
export const recordReading = (
  post: TrackedPost,
  metrics: PostMetrics,
  collectedAt: DateTime.Utc,
  at: DateTime.Utc
): TrackedPost =>
  withCollection(post, scheduledAfter(post, at), {
    lastCollectedAt: Option.some(collectedAt),
    latest: Option.some(metrics),
  });

/**
 * The post once the run `at` could not read it, as when the platform no
 * longer shows it or its channel is turned off: it waits for its next turn,
 * with the counts it had.
 */
export const skipReading = (post: TrackedPost, at: DateTime.Utc): TrackedPost =>
  withCollection(post, scheduledAfter(post, at));

/** The post, no longer read from `at`. */
export const endCollection = (
  post: TrackedPost,
  reason: CollectionEnd,
  at: DateTime.Utc
): TrackedPost => withCollection(post, { _tag: "ended", at, reason });
