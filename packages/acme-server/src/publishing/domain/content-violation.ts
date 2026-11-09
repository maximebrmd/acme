import { Schema } from "effect";

import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

import { MediaContentTypeSchema } from "./media-file.ts";
import { TextUnitSchema } from "./text-length.ts";

const onChannel = { channelId: ChannelIdSchema, platform: PlatformSchema };

const tooMany = {
  ...onChannel,
  count: Schema.Int,
  maximum: Schema.Int,
};

// One of the post's images or videos, on one channel.
const onMedia = { ...onChannel, mediaId: MediaAssetIdSchema };

const sized = {
  ...onMedia,
  height: Schema.Int,
  width: Schema.Int,
};

/**
 * Something about a post's content that keeps it from being scheduled, or
 * saved. Each names what is wrong, never the content itself.
 */
export const ContentViolationSchema = Schema.Union([
  // The post is for no channel.
  Schema.TaggedStruct("noChannels", {}),
  // A text override names a channel the post is not for.
  Schema.TaggedStruct("overrideWithoutChannel", { channelId: ChannelIdSchema }),
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
]);

export type ContentViolation = typeof ContentViolationSchema.Type;
