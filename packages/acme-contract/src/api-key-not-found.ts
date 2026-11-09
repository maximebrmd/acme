import { Schema } from "effect";

/** The workspace has no API key with this id. */
export class ApiKeyNotFound extends Schema.TaggedError<ApiKeyNotFound>()(
  "ApiKeyNotFound",
  {},
  {
    description: "The workspace has no API key with this id.",
    httpApiStatus: 404,
  }
) {}
