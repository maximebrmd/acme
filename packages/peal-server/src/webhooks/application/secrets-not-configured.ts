import { Schema } from "effect";

/**
 * The server cannot encrypt a signing secret, having no key for it, or can
 * no longer read one it stored, its key being gone from the keyring.
 */
export class SecretsNotConfigured extends Schema.TaggedError<SecretsNotConfigured>()(
  "SecretsNotConfigured",
  {}
) {}
