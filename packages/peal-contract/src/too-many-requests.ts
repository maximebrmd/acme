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
    // The policy that set `limit`, as `RateLimit-Policy` names it: `default`
    // (the server's setting), `free` (a billing account without a payment
    // method, on a server that bills) or `override` (a limit Peal set for
    // the workspace on request). Absent from older servers.
    policy: Schema.optionalKey(
      Schema.Literals(["default", "free", "override"])
    ),
    // Seconds until the window ends, as the `Retry-After` header says.
    retryAfterSeconds: Schema.Int,
    // How long a window lasts.
    windowSeconds: Schema.Int,
    // On the `free` policy, the limit a payment method on the billing page
    // gives instead.
    withPaymentMethod: Schema.optionalKey(Schema.Int),
  },
  {
    description:
      "This credential sent more than `limit` requests in `windowSeconds` seconds: nothing was done. Wait `retryAfterSeconds` seconds, as the `Retry-After` header says, then send the request again. Every answer to a key or a token carries the `RateLimit-Policy` and `RateLimit` headers, which say how many requests are left. `policy` says which limit applied: on a server that bills, a billing account without a payment method sends fewer (`free`), and `withPaymentMethod` is what a payment method gives.",
    httpApiStatus: 429,
  }
) {}
