import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace already has a channel set of this name. */
export class ChannelSetNameTaken extends Schema.TaggedError<ChannelSetNameTaken>()(
  "ChannelSetNameTaken",
  { ...errorEnvelope },
  {
    description:
      "The workspace already has a channel set of this name, whatever its case. Nothing was changed.",
    httpApiStatus: 409,
  }
) {}
