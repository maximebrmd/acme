import { Schema } from "effect";

/** The workspace has no channel with this id. */
export class ChannelNotFound extends Schema.TaggedError<ChannelNotFound>()(
  "ChannelNotFound",
  {},
  {
    description: "The workspace has no channel with this id.",
    httpApiStatus: 404,
  }
) {}
