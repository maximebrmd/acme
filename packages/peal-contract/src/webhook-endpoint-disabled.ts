import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The endpoint is off, so nothing is sent to it: turn it on first. */
export class WebhookEndpointDisabled extends Schema.TaggedError<WebhookEndpointDisabled>()(
  "WebhookEndpointDisabled",
  { ...errorEnvelope },
  {
    description:
      "The endpoint is off, so nothing is sent to it: turn it on first.",
    httpApiStatus: 409,
  }
) {}
