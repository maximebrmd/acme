import { Schema } from "effect";

/**
 * The token did not authenticate: it was changed, it belongs to another
 * channel, or the key under its key id is not the one that encrypted it.
 * Which of these is deliberately not told apart.
 */
export class TokenAuthenticationFailed extends Schema.TaggedError<TokenAuthenticationFailed>()(
  "TokenAuthenticationFailed",
  {}
) {}
