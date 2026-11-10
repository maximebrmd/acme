import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The channel cannot post now: it is turned off (`disabled`), or its
 * account must be reconnected (`reconnect`).
 */
export class ChannelCannotPost extends Schema.TaggedError<ChannelCannotPost>()(
  "ChannelCannotPost",
  { ...errorEnvelope, reason: Schema.Literals(["disabled", "reconnect"]) },
  {
    description:
      "The channel cannot post now: it is turned off (`disabled`), or its account must be reconnected (`reconnect`).",
    httpApiStatus: 409,
  }
) {}
