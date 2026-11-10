import { Schema } from "effect";

/** This server cannot keep signing secrets, so it has no webhooks. */
export class WebhooksNotConfigured extends Schema.TaggedError<WebhooksNotConfigured>()(
  "WebhooksNotConfigured",
  {},
  {
    description:
      "This server cannot keep a signing secret: its operator has not set the keys that encrypt them (`PEAL_TOKEN_KEYS`). Nothing was saved.",
    httpApiStatus: 503,
  }
) {}
