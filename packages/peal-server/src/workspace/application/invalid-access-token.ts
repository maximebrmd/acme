import { Schema } from "effect";

/**
 * An OAuth access token was missing, invalid, expired, issued for another
 * resource, or without the scopes the request needs. `status` and
 * `challenge` (the `WWW-Authenticate` value) tell the client how to get a
 * token that works: 401 to sign in again, 403 to ask for more scopes.
 */
export class InvalidAccessToken extends Schema.TaggedError<InvalidAccessToken>()(
  "InvalidAccessToken",
  {
    challenge: Schema.String,
    description: Schema.String,
    status: Schema.Literals([401, 403]),
  }
) {}
