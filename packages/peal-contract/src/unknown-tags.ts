import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** Some tags asked for are not the workspace's. */
export class UnknownTags extends Schema.TaggedError<UnknownTags>()(
  "UnknownTags",
  { ...errorEnvelope, tagIds: Schema.Array(Schema.String) },
  {
    description:
      "Some tags asked for are not the workspace's: `tagIds` lists them.",
    httpApiStatus: 422,
  }
) {}
