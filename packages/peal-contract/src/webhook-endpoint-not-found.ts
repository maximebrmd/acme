import { Schema } from "effect";

/** The workspace has no webhook endpoint with this id. */
export class WebhookEndpointNotFound extends Schema.TaggedError<WebhookEndpointNotFound>()(
  "WebhookEndpointNotFound",
  {},
  {
    description: "The workspace has no webhook endpoint with this id.",
    httpApiStatus: 404,
  }
) {}
