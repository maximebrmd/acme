import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The request carries no session or key, or one that no longer works. */
export class Unauthenticated extends Schema.TaggedError<Unauthenticated>()(
  "Unauthenticated",
  { ...errorEnvelope },
  {
    description:
      "Sign in, or send an API key as a bearer token: the request has no valid credentials.",
    httpApiStatus: 401,
  }
) {}
