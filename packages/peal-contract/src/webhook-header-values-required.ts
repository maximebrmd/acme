import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * A change that moves an endpoint with headers to another origin (scheme,
 * host or port) while keeping a header's value: the values were given for
 * the old origin, and Peal never sends them to another. Nothing was saved.
 */
export class WebhookHeaderValuesRequired extends Schema.TaggedError<WebhookHeaderValuesRequired>()(
  "WebhookHeaderValuesRequired",
  { ...errorEnvelope },
  {
    description:
      "The new `url` is on another origin (scheme, host or port) than the endpoint's, and the endpoint has headers: their values are never sent to another origin. Send `headers` again in the same request, each with its `value`, or `[]` to remove them. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
