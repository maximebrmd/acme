import { Schema } from "effect";

/** The endpoint has no delivery with this id: it never existed, or its log no longer keeps it. */
export class WebhookDeliveryNotFound extends Schema.TaggedError<WebhookDeliveryNotFound>()(
  "WebhookDeliveryNotFound",
  {},
  {
    description:
      "The endpoint has no delivery with this id: it never existed, or its log no longer keeps it.",
    httpApiStatus: 404,
  }
) {}
