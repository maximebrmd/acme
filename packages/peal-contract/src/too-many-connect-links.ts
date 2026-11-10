import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has as many connect links waiting as it may. */
export class TooManyConnectLinks extends Schema.TaggedError<TooManyConnectLinks>()(
  "TooManyConnectLinks",
  {
    ...errorEnvelope,
    allowed: Schema.Int,
  },
  {
    description:
      "The workspace has `allowed` connect links waiting to be used, the most it may: revoke some, or wait for them to be used or to expire.",
    httpApiStatus: 429,
  }
) {}
