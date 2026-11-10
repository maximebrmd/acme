import { Schema } from "effect";

/**
 * A sign-in to an ad network did not come to a grant:
 *
 * - `denied`: the person refused, or left out a permission reading needs.
 * - `expired`: its state is unknown, used, or older than 15 minutes, or it
 *   was started by someone else.
 * - `failed`: the network refused the exchange.
 * - `notConfigured`: the server has no key to encrypt the token with.
 */
export class AdSignInFailed extends Schema.TaggedError<AdSignInFailed>()(
  "AdSignInFailed",
  { reason: Schema.Literals(["denied", "expired", "failed", "notConfigured"]) }
) {}
