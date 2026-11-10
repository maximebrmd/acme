import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** Some channels asked for are not connected to the workspace. */
export class UnknownChannels extends Schema.TaggedError<UnknownChannels>()(
  "UnknownChannels",
  { ...errorEnvelope, channelIds: Schema.Array(Schema.String) },
  {
    description:
      "Some channels asked for are not connected to the workspace: `channelIds` lists them.",
    httpApiStatus: 422,
  }
) {}
