import { Schema } from "effect";

import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

import { TextUnitSchema } from "./text-length.ts";

const onChannel = { channelId: ChannelIdSchema, platform: PlatformSchema };

const tooMany = {
  ...onChannel,
  count: Schema.Int,
  maximum: Schema.Int,
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
]);

export type ContentViolation = typeof ContentViolationSchema.Type;
