import { Schema } from "effect";

/** The workspace a channel is moved from has no channel with this id. */
export class CustomerChannelNotFound extends Schema.TaggedError<CustomerChannelNotFound>()(
  "CustomerChannelNotFound",
  {}
) {}
