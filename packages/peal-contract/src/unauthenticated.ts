import { Schema } from "effect";

/** The request carries no session or key, or one that no longer works. */
export class Unauthenticated extends Schema.TaggedError<Unauthenticated>()(
  "Unauthenticated",
  {},
  {
    description:
      "Sign in, or send an API key as a bearer token: the request has no valid credentials.",
    httpApiStatus: 401,
  }
) {}
