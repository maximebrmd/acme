import { Schema } from "effect";

/**
 * This server publishes no OAuth client document for the platform: it runs
 * without the keys a confidential client needs, as in development.
 */
export class OAuthClientNotPublished extends Schema.TaggedError<OAuthClientNotPublished>()(
  "OAuthClientNotPublished",
  {},
  {
    description:
      "This server publishes no OAuth client for the platform: it has no client keys configured.",
    httpApiStatus: 404,
  }
) {}
