import { Schema } from "effect";

import { MediaContentTypeSchema } from "./media.ts";
import { PlatformSchema } from "./platform.ts";
import { TextUnitSchema } from "./post-text.ts";

const onChannel = { channelId: Schema.String, platform: PlatformSchema };

const tooMany = { ...onChannel, count: Schema.Int, maximum: Schema.Int };

// One of the post's images or videos, on one channel.
const onMedia = { ...onChannel, mediaId: Schema.String };

const sized = { ...onMedia, height: Schema.Int, width: Schema.Int };

/**
 * Something about a post's content that keeps it from being saved or
 * scheduled. The server's list (src/publishing/domain/content-violation.ts)
 * is the source; a test keeps the two equal.
 */
export const ContentViolationSchema = Schema.Union([
  // The post is for no channel.
  Schema.TaggedStruct("noChannels", {}),
  // A text override names a channel the post is not for.
  Schema.TaggedStruct("overrideWithoutChannel", { channelId: Schema.String }),
  // The post would go out on the channel with no text and no media.
  Schema.TaggedStruct("empty", onChannel),
  // The text on the channel is longer than its platform takes.
  Schema.TaggedStruct("textTooLong", {
    ...onChannel,
    length: Schema.Int,
    maximum: Schema.Int,
    unit: TextUnitSchema,
  }),
  Schema.TaggedStruct("tooManyMedia", tooMany),
  // The platform publishes nothing without an image or a video.
  Schema.TaggedStruct("mediaRequired", onChannel),
  Schema.TaggedStruct("tooManyHashtags", tooMany),
  Schema.TaggedStruct("tooManyMentions", tooMany),
  // More different links than the platform takes in one post.
  Schema.TaggedStruct("tooManyLinks", tooMany),
  // More videos than the platform shows in one post.
  Schema.TaggedStruct("tooManyVideos", tooMany),
  // Images and videos together, which the platform never shows in one post.
  Schema.TaggedStruct("mixedMedia", onChannel),
  // The platform takes no file of this type.
  Schema.TaggedStruct("mediaTypeUnsupported", {
    ...onMedia,
    contentType: MediaContentTypeSchema,
  }),
  // The file is larger than the platform takes, in bytes.
  Schema.TaggedStruct("mediaTooLarge", {
    ...onMedia,
    byteSize: Schema.Int,
    maximum: Schema.Int,
  }),
  // The file is smaller than the platform takes, in bytes.
  Schema.TaggedStruct("mediaTooSmall", {
    ...onMedia,
    byteSize: Schema.Int,
    minimum: Schema.Int,
  }),
  // The video lasts longer than the platform takes, in milliseconds.
  Schema.TaggedStruct("videoTooLong", {
    ...onMedia,
    durationMs: Schema.Int,
    maximumMs: Schema.Int,
  }),
  Schema.TaggedStruct("videoTooShort", {
    ...onMedia,
    durationMs: Schema.Int,
    minimumMs: Schema.Int,
  }),
  // Width times height is more than the platform takes.
  Schema.TaggedStruct("tooManyPixels", { ...sized, maximum: Schema.Int }),
  // Width over height is outside what the platform takes.
  Schema.TaggedStruct("aspectRatioUnsupported", {
    ...sized,
    maximum: Schema.Number,
    minimum: Schema.Number,
  }),
  // The alt text is longer than the platform keeps, in code points.
  Schema.TaggedStruct("altTextTooLong", {
    ...onMedia,
    length: Schema.Int,
    maximum: Schema.Int,
  }),
]).annotate({ identifier: "ContentViolation" });

export type ContentViolation = typeof ContentViolationSchema.Type;

/** The post's content breaks the rules of its channels' platforms. */
export class PostContentInvalid extends Schema.TaggedError<PostContentInvalid>()(
  "PostContentInvalid",
  { violations: Schema.Array(ContentViolationSchema) },
  {
    description:
      "The post's content breaks the rules of its channels' platforms: `violations` says how, channel by channel, and for its images and videos, media by media.",
    httpApiStatus: 422,
  }
) {}
