import { Schema } from "effect";

/** Some channels asked for are not connected to the workspace. */
export class UnknownChannels extends Schema.TaggedError<UnknownChannels>()(
  "UnknownChannels",
  { channelIds: Schema.Array(Schema.String) },
  {
    description:
      "Some channels asked for are not connected to the workspace: `channelIds` lists them.",
    httpApiStatus: 422,
  }
) {}
