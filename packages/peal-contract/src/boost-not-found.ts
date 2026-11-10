import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no boost with this id. */
export class BoostNotFound extends Schema.TaggedError<BoostNotFound>()(
  "BoostNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no boost with this id.",
    httpApiStatus: 404,
  }
) {}
