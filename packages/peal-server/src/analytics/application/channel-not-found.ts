import { Schema } from "effect";

/** No channel of the workspace that analytics follows has this id. */
export class ChannelNotFound extends Schema.TaggedError<ChannelNotFound>()(
  "ChannelNotFound",
  {}
) {}
