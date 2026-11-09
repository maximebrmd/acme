import { Schema } from "effect";

/**
 * The credentials are valid, but do not allow this: a missing permission, a
 * banned account, an API key used outside its workspace, or a cookie sent
 * from another site.
 */
export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  {},
  {
    description: "The credentials are valid but do not allow this request.",
    httpApiStatus: 403,
  }
) {}
