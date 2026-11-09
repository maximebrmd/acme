import { Schema } from "effect";

import {
  PlatformPostIdSchema,
  UnconfirmedReasonSchema,
} from "#shared/domain/publish-result.ts";

/**
 * Why a post did not go out on a channel. Targets are stored with it, so
 * members may be added but never renamed or removed.
 */
export const FailureReasonSchema = Schema.Literals([
  // The platform refused the post as sent: text too long, a duplicate,
  // against its rules, or a request it could not read.
  "contentRejected",
  // The channel was disconnected from the workspace before the post went
  // out: nothing was sent.
  "channelDisconnected",
  // The channel was turned off before the post went out: nothing was sent.
  "channelDisabled",
  // One of its images or videos was deleted, or is no longer ready, before
  // the post went out: nothing was sent.
  "mediaRemoved",
  // The platform refused an image or a video.
  "mediaRejected",
  // The server was down at the scheduled time, and the post was too late to
  // send when it came back.
  "missed",
  // The user checked an unconfirmed post and found it missing.
  "notPublished",
  // The platform kept rate limiting until the attempt gave up.
  "rateLimited",
  // A daily allowance stayed spent until the attempt gave up: the server's
  // quota of uploads on the platform, or the account's own (YouTube).
  "quotaExceeded",
  // The channel's token expired or was revoked: the user must reconnect.
  "tokenExpired",
  // The platform could not be reached, and nothing was sent.
  "unavailable",
  // The platform takes only some posts from this server's app until it
  // approves it, as TikTok takes only private posts from an app it has
  // not audited: nothing was sent.
  "appNotAudited",
]);

export type FailureReason = typeof FailureReasonSchema.Type;

const PendingSchema = Schema.TaggedStruct("pending", {});

const PublishingSchema = Schema.TaggedStruct("publishing", {
  // The post was cancelled while this target was sending: no new attempt
  // starts, and one in flight still records how it ended.
  cancelRequested: Schema.Boolean,
  startedAt: Schema.DateTimeUtc,
});

const PublishedSchema = Schema.TaggedStruct("published", {
  // The platform made it private, although it was asked to show it to more
  // people (YouTube, for an API project or a channel it restricts).
  keptPrivate: Schema.optionalKey(Schema.Boolean),
  permalink: Schema.Option(Schema.String),
  // None when the user confirmed an unconfirmed post by hand.
  platformPostId: Schema.Option(PlatformPostIdSchema),
  // When the platform accepted the post, or for a post the user confirmed,
  // when the attempt that published it started.
  publishedAt: Schema.DateTimeUtc,
});

const FailedSchema = Schema.TaggedStruct("failed", {
  // The platform's own reason, for support. Never content.
  code: Schema.Option(Schema.String),
  failedAt: Schema.DateTimeUtc,
  reason: FailureReasonSchema,
});

// The attempt ended without an answer, after the request may have reached
// the platform: the post may be live. Acme never retries it on its own; the
// user checks the platform and confirms either outcome.
const UnconfirmedSchema = Schema.TaggedStruct("unconfirmed", {
  attemptedAt: Schema.DateTimeUtc,
  reason: UnconfirmedReasonSchema,
});

const CancelledSchema = Schema.TaggedStruct("cancelled", {
  cancelledAt: Schema.DateTimeUtc,
});

/** Where the publication of a post on one channel is. */
export const PostTargetStatusSchema = Schema.Union([
  PendingSchema,
  PublishingSchema,
  PublishedSchema,
  FailedSchema,
  UnconfirmedSchema,
  CancelledSchema,
]);

export type PostTargetStatus = typeof PostTargetStatusSchema.Type;

export const PostTargetStatusNameSchema = Schema.Literals([
  "pending",
  "publishing",
  "published",
  "failed",
  "unconfirmed",
  "cancelled",
]);

export type PostTargetStatusName = PostTargetStatus["_tag"];
