import { Schema } from "effect";

import { Schedule } from "./schedule.ts";

/** Why a post did not go out. */
export const FailureReasonSchema = Schema.Literals([
  // The platform refused the text: too long, a duplicate, against its rules.
  "contentRejected",
  // The platform refused an image or a video.
  "mediaRejected",
  // The user checked an unconfirmed post and found it missing.
  "notPublished",
  // The platform kept rate limiting until the attempt gave up.
  "rateLimited",
  // The channel's token expired or was revoked: the user must reconnect.
  "tokenExpired",
  // The platform could not be reached, and nothing was sent.
  "unavailable",
]);

export type FailureReason = typeof FailureReasonSchema.Type;

/** The id a platform gave a published post. */
export const PlatformPostIdSchema = Schema.NonEmptyString.pipe(
  Schema.brand("PlatformPostId")
);

export type PlatformPostId = typeof PlatformPostIdSchema.Type;

const DraftSchema = Schema.TaggedStruct("draft", {});

const ScheduledSchema = Schema.TaggedStruct("scheduled", {
  schedule: Schedule,
});

const PublishingSchema = Schema.TaggedStruct("publishing", {
  schedule: Schedule,
  startedAt: Schema.DateTimeUtc,
});

const PublishedSchema = Schema.TaggedStruct("published", {
  // None when the user confirmed an unconfirmed post by hand.
  platformPostId: Schema.Option(PlatformPostIdSchema),
  publishedAt: Schema.DateTimeUtc,
});

const FailedSchema = Schema.TaggedStruct("failed", {
  failedAt: Schema.DateTimeUtc,
  reason: FailureReasonSchema,
});

// The attempt ended without an answer, after the request may have reached
// the platform: the post may be live. Acme never retries it on its own; the
// user checks the platform and confirms either outcome.
const UnconfirmedSchema = Schema.TaggedStruct("unconfirmed", {
  attemptedAt: Schema.DateTimeUtc,
});

/** Where a post is in its life, with what each stage knows. */
export const PostStatusSchema = Schema.Union([
  DraftSchema,
  ScheduledSchema,
  PublishingSchema,
  PublishedSchema,
  FailedSchema,
  UnconfirmedSchema,
]);

export type PostStatus = typeof PostStatusSchema.Type;

export const PostStatusNameSchema = Schema.Literals([
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "unconfirmed",
]);

export type PostStatusName = PostStatus["_tag"];
