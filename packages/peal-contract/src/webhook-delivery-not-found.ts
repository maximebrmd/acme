import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The endpoint has no delivery with this id: it never existed, or its log no longer keeps it. */
export class WebhookDeliveryNotFound extends Schema.TaggedError<WebhookDeliveryNotFound>()(
  "WebhookDeliveryNotFound",
  { ...errorEnvelope },
  {
    description:
      "The endpoint has no delivery with this id: it never existed, or its log no longer keeps it.",
    httpApiStatus: 404,
  }
) {}
