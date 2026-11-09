import { Schema } from "effect";

/**
 * There is no key to encrypt channel tokens with: the server was started
 * without a token keyring (PEAL_TOKEN_KEYS), so no channel can be stored until
 * one is set.
 */
export class MissingTokenKey extends Schema.TaggedError<MissingTokenKey>()(
  "MissingTokenKey",
  {}
) {}
