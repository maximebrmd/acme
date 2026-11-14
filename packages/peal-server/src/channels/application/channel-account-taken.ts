import { Schema } from "effect";

/**
 * The workspace a channel moves to has a channel of the same account
 * (`channelId`), as the workspace it is in has itself: an account is
 * connected once per workspace.
 */
export class ChannelAccountTaken extends Schema.TaggedError<ChannelAccountTaken>()(
  "ChannelAccountTaken",
  { channelId: Schema.String }
) {}
