import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** Some media attached are not the workspace's, or not ready to show. */
export class UnknownMedia extends Schema.TaggedError<UnknownMedia>()(
  "UnknownMedia",
  { ...errorEnvelope, mediaIds: Schema.Array(Schema.String) },
  {
    description:
      "Some media attached are not the workspace's, or not ready to show: `mediaIds` lists them.",
    httpApiStatus: 422,
  }
) {}
