import { Schema } from "effect";

/**
 * The server cannot encrypt the key of a workspace's image or text
 * provider: its operator has set no keyring (`PEAL_TOKEN_KEYS`), so it
 * keeps no key.
 */
export class ProviderSecretsNotConfigured extends Schema.TaggedError<ProviderSecretsNotConfigured>()(
  "ProviderSecretsNotConfigured",
  {}
) {}
