import { Schema } from "effect";

/** The endpoint is off, so nothing is sent to it: turn it on first. */
export class WebhookEndpointDisabled extends Schema.TaggedError<WebhookEndpointDisabled>()(
  "WebhookEndpointDisabled",
  {},
  {
    description:
      "The endpoint is off, so nothing is sent to it: turn it on first.",
    httpApiStatus: 409,
  }
) {}
