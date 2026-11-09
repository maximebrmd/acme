import { Schema } from "effect";

import { PlatformSchema } from "./platform.ts";
import { TextUnitSchema } from "./post-text.ts";

const onChannel = { channelId: Schema.String, platform: PlatformSchema };

const tooMany = { ...onChannel, count: Schema.Int, maximum: Schema.Int };

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
]).annotate({ identifier: "ContentViolation" });

export type ContentViolation = typeof ContentViolationSchema.Type;

/** The post's content breaks the rules of its channels' platforms. */
export class PostContentInvalid extends Schema.TaggedError<PostContentInvalid>()(
  "PostContentInvalid",
  { violations: Schema.Array(ContentViolationSchema) },
  {
    description:
      "The post's content breaks the rules of its channels' platforms: `violations` says how, channel by channel.",
    httpApiStatus: 422,
  }
) {}
