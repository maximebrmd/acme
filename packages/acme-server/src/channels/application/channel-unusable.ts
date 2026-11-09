import { Schema } from "effect";

/**
 * Nothing can be posted on the channel, and no token would change that: it
 * was disconnected (`notFound`), or a member turned it off (`disabled`).
 */
export class ChannelUnusable extends Schema.TaggedError<ChannelUnusable>()(
  "ChannelUnusable",
  {
    channelId: Schema.String,
    reason: Schema.Literals(["notFound", "disabled"]),
  }
) {}
