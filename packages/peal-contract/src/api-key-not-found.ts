import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no API key with this id. */
export class ApiKeyNotFound extends Schema.TaggedError<ApiKeyNotFound>()(
  "ApiKeyNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no API key with this id.",
    httpApiStatus: 404,
  }
) {}
