import { Schema } from "effect";

/**
 * The channel cannot post now: it is turned off (`disabled`), or its
 * account must be reconnected (`reconnect`).
 */
export class ChannelCannotPost extends Schema.TaggedError<ChannelCannotPost>()(
  "ChannelCannotPost",
  { reason: Schema.Literals(["disabled", "reconnect"]) },
  {
    description:
      "The channel cannot post now: it is turned off (`disabled`), or its account must be reconnected (`reconnect`).",
    httpApiStatus: 409,
  }
) {}
