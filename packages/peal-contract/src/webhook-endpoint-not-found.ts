import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no webhook endpoint with this id. */
export class WebhookEndpointNotFound extends Schema.TaggedError<WebhookEndpointNotFound>()(
  "WebhookEndpointNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no webhook endpoint with this id.",
    httpApiStatus: 404,
  }
) {}
