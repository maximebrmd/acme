import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The API key, or the application acting for a user, sent more requests
 * than the server takes from one credential in a window. Nothing was done.
 */
export class TooManyRequests extends Schema.TaggedError<TooManyRequests>()(
  "TooManyRequests",
  {
    ...errorEnvelope,
    // How many requests the credential may send in a window.
    limit: Schema.Int,
    // Seconds until the window ends, as the `Retry-After` header says.
    retryAfterSeconds: Schema.Int,
    // How long a window lasts.
    windowSeconds: Schema.Int,
  },
  {
    description:
      "This credential sent more than `limit` requests in `windowSeconds` seconds: nothing was done. Wait `retryAfterSeconds` seconds, as the `Retry-After` header says, then send the request again. Every answer to a key or a token carries the `RateLimit-Policy` and `RateLimit` headers, which say how many requests are left.",
    httpApiStatus: 429,
  }
) {}
