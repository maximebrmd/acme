import { Schema } from "effect";

/** The workspace has no webhook endpoint with this id. */
export class EndpointNotFound extends Schema.TaggedError<EndpointNotFound>()(
  "EndpointNotFound",
  { endpointId: Schema.String }
) {}
