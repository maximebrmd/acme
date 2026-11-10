import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The channel's platform has no lookup of this name. */
export class LookupNotFound extends Schema.TaggedError<LookupNotFound>()(
  "LookupNotFound",
  { ...errorEnvelope },
  {
    description:
      "The channel's platform has no lookup of this name: list the channel's lookups for those it has.",
    httpApiStatus: 404,
  }
) {}
