import { Schema } from "effect";

/**
 * What an ad network adds to the callback page's address: the state of the
 * sign-in, and a code, or an error when the person refused.
 */
export const AdSignInCallbackSchema = Schema.Struct({
  code: Schema.optionalKey(Schema.String),
  error: Schema.optionalKey(Schema.String),
  state: Schema.String,
});

export type AdSignInCallback = typeof AdSignInCallbackSchema.Type;
