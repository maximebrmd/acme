import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace a channel is moved to has a channel of the same account
 * already: an account is connected once per workspace.
 */
export class ChannelAccountTaken extends Schema.TaggedError<ChannelAccountTaken>()(
  "ChannelAccountTaken",
  {
    ...errorEnvelope,
    // The workspace's channel of that account: the channel itself when it
    // is moved to the workspace it is in.
    channelId: Schema.String,
  },
  {
    description:
      "The workspace the channel is moved to has a channel of the same account already (`channelId`), or is the workspace it is in. Nothing was moved.",
    httpApiStatus: 409,
  }
) {}
