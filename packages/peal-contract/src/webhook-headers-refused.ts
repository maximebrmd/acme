import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Headers the endpoint cannot carry: a header given without `value` that
 * the endpoint does not have, so there is no value to keep. Nothing was
 * saved.
 */
export class WebhookHeadersRefused extends Schema.TaggedError<WebhookHeadersRefused>()(
  "WebhookHeadersRefused",
  { ...errorEnvelope },
  {
    description:
      "A header given without `value` keeps the value the endpoint has under that name: the endpoint has none, so give its value. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
