import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no channel with this id. */
export class ChannelNotFound extends Schema.TaggedError<ChannelNotFound>()(
  "ChannelNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no channel with this id.",
    httpApiStatus: 404,
  }
) {}
