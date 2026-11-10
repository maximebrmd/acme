import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no channel set with this id or name. */
export class ChannelSetNotFound extends Schema.TaggedError<ChannelSetNotFound>()(
  "ChannelSetNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no channel set with this id, or of this name where a request names one.",
    httpApiStatus: 404,
  }
) {}
