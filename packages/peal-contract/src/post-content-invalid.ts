import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { ByteCountSchema } from "./int64.ts";
import { MediaContentTypeSchema } from "./media.ts";
import { PlatformSchema } from "./platform.ts";
import { TextUnitSchema } from "./post-text.ts";

// On one channel, and in one part of the post: `part` is the part's place,
// from 1, and is left out for the first part, and for what is said of the
// whole post there.
const onChannel = {
  channelId: Schema.String,
  part: Schema.optionalKey(Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))),
  platform: PlatformSchema,
};

const tooMany = { ...onChannel, count: Schema.Int, maximum: Schema.Int };

// One of the options the post has on the channel, by name.
const onOption = { ...onChannel, field: Schema.String };

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
  // Options name a channel the post is not for.
  Schema.TaggedStruct("optionsWithoutChannel", { channelId: Schema.String }),
  // The options on the channel are another platform's.
  Schema.TaggedStruct("optionsForOtherPlatform", {
    ...onChannel,
    optionsPlatform: PlatformSchema,
  }),
  // The channel's platform needs this option (`field`), and it has none.
  Schema.TaggedStruct("optionMissing", onOption),
  // The option is longer than the platform takes, in code points.
  Schema.TaggedStruct("optionTooLong", {
    ...onOption,
    length: Schema.Int,
    maximum: Schema.Int,
  }),
  // The platform refuses the option's value, for a reason of the field's
  // own: a YouTube title with "<" or ">", a blank tag or one with a comma,
  // a category that is not a number; a TikTok post disclosed as commercial
  // without saying whose (`commercialContent`), or a paid partnership only
  // its creator may see (`brandContent`).
  Schema.TaggedStruct("optionInvalid", onOption),
  // The post would go out on the channel with no text and no media.
  Schema.TaggedStruct("empty", onChannel),
  // The text on the channel is longer than its platform takes.
  Schema.TaggedStruct("textTooLong", {
    ...onChannel,
    length: Schema.Int,
    maximum: Schema.Int,
    unit: TextUnitSchema,
  }),
  // The text on the channel holds characters its platform refuses (YouTube:
  // "<" and ">"), each named once.
  Schema.TaggedStruct("forbiddenCharacters", {
    ...onChannel,
    characters: Schema.Array(Schema.String),
  }),
  Schema.TaggedStruct("tooManyMedia", tooMany),
  // The post has more parts than the platform takes: `maximum` is 1 where
  // it takes a post alone, with no thread and no comment after it.
  Schema.TaggedStruct("tooManyParts", tooMany),
  // The part is a first comment the channel's account has not let Peal
  // post: connect the channel again to grant the comment permission.
  Schema.TaggedStruct("partsNeedReconnect", onChannel),
  // The part is a first comment the platform takes none of under this
  // post, as the option `field` says (YouTube turns comments off on a
  // video made for kids).
  Schema.TaggedStruct("commentsTurnedOff", {
    ...onChannel,
    field: Schema.String,
  }),
  // The post asks a poll, which Peal sends to none of the platform's posts.
  Schema.TaggedStruct("pollNotSupported", onChannel),
  // The poll has fewer or more choices than the platform takes.
  Schema.TaggedStruct("pollChoiceCount", {
    ...onChannel,
    count: Schema.Int,
    maximum: Schema.Int,
    minimum: Schema.Int,
  }),
  // A choice, by its place from 1, is empty or longer than the platform
  // takes, counted in `unit`.
  Schema.TaggedStruct("pollChoiceLength", {
    ...onChannel,
    choice: Schema.Int,
    length: Schema.Int,
    maximum: Schema.Int,
    unit: TextUnitSchema,
  }),
  // The poll stays open longer or shorter than the platform takes.
  Schema.TaggedStruct("pollDurationOutOfRange", {
    ...onChannel,
    durationMinutes: Schema.Int,
    maximumMinutes: Schema.Int,
    minimumMinutes: Schema.Int,
  }),
  // The poll lets readers pick several choices, which the platform does
  // not.
  Schema.TaggedStruct("pollMultipleChoice", onChannel),
  // The post shows a file beside its poll, which the platform refuses.
  Schema.TaggedStruct("pollWithMedia", onChannel),
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
    byteSize: ByteCountSchema,
    maximum: ByteCountSchema,
  }),
  // The file is smaller than the platform takes, in bytes.
  Schema.TaggedStruct("mediaTooSmall", {
    ...onMedia,
    byteSize: ByteCountSchema,
    minimum: ByteCountSchema,
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
  // A side is shorter or longer than the platform takes, in pixels.
  Schema.TaggedStruct("sideOutOfRange", {
    ...sized,
    maximum: Schema.Int,
    minimum: Schema.Int,
  }),
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
  { ...errorEnvelope, violations: Schema.Array(ContentViolationSchema) },
  {
    description:
      "The post's content breaks the rules of its channels' platforms: `violations` says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (`field`).",
    httpApiStatus: 422,
  }
) {}
