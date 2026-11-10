import { Schema } from "effect";

import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";

/** The endpoint is off: nothing is sent to it. */
export class EndpointDisabled extends Schema.TaggedError<EndpointDisabled>()(
  "EndpointDisabled",
  { endpointId: WebhookEndpointIdSchema }
) {}
