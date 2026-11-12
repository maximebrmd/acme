import { Schema } from "effect";

/** The id a platform gave a published post. */
export const PlatformPostIdSchema = Schema.NonEmptyString.pipe(
  Schema.brand("PlatformPostId")
);

export type PlatformPostId = typeof PlatformPostIdSchema.Type;

/** The platform accepted the post, which is now live. */
export const PublishedSchema = Schema.TaggedStruct("published", {
  // The platform made the post private although Peal asked for more people
  // to see it (YouTube, for an API project or a channel it restricts).
  keptPrivate: Schema.optionalKey(Schema.Boolean),
  // The post's public address, when the platform gives one.
  permalink: Schema.optionalKey(Schema.String),
  platformPostId: PlatformPostIdSchema,
  // The video went live without the thumbnail its options named: the
  // channel may not set custom thumbnails, or the platform refused the
  // image (YouTube). Never a reason to fail the post.
  thumbnailNotSet: Schema.optionalKey(Schema.Boolean),
});

export type Published = typeof PublishedSchema.Type;

/** Why the outcome of a call is not known. */
export const UnconfirmedReasonSchema = Schema.Literals([
  // The request may have reached the platform, and no answer came back: a
  // timeout, or a connection that dropped after sending.
  "noResponse",
  // An answer came back that could not be read.
  "unreadableResponse",
  // An earlier run of the same attempt stopped during the call, as when the
  // server restarted, so whether it went out is not known.
  "interrupted",
  // The adapter failed during the call, after the request may have left.
  "adapterFailure",
  // The platform took the post and, when Peal stopped checking, still had
  // not said it was published (a video it was still processing).
  "stillProcessing",
]);

export type UnconfirmedReason = typeof UnconfirmedReasonSchema.Type;

/**
 * Whether the post went live is not known. It may be live: Peal never sends
 * it again on its own, and the user checks the platform.
 */
export const UnconfirmedSchema = Schema.TaggedStruct("unconfirmed", {
  reason: UnconfirmedReasonSchema,
});

export type Unconfirmed = typeof UnconfirmedSchema.Type;

/**
 * How a publishing call ended, when the platform did not refuse it. Workflows
 * store these in their history, so members may be added but never renamed or
 * removed.
 */
export const PublishResultSchema = Schema.Union([
  PublishedSchema,
  UnconfirmedSchema,
]);

export type PublishResult = typeof PublishResultSchema.Type;
