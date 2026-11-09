import { Schema } from "effect";

/**
 * The platform refused the token a call was made with, as expired or
 * invalid, before doing anything the call asked: renewing the token and
 * making the call again is safe. Platform adapters report it, and the
 * channels context renews the token once; a second refusal makes the
 * channel need reconnecting (`TokenExpired`).
 */
export class TokenRejected extends Schema.TaggedError<TokenRejected>()(
  "TokenRejected",
  {}
) {}

/** Whether a failure is a TokenRejected. */
export const isTokenRejected = Schema.is(TokenRejected);
