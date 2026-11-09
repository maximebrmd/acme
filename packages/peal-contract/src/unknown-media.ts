import { Schema } from "effect";

/** Some media attached are not the workspace's, or not ready to show. */
export class UnknownMedia extends Schema.TaggedError<UnknownMedia>()(
  "UnknownMedia",
  { mediaIds: Schema.Array(Schema.String) },
  {
    description:
      "Some media attached are not the workspace's, or not ready to show: `mediaIds` lists them.",
    httpApiStatus: 422,
  }
) {}
