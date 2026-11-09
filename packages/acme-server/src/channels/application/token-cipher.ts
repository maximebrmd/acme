import { Context, Schema } from "effect";
import type { Effect, Redacted } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

import type { MalformedEncryptedToken } from "./malformed-encrypted-token.ts";
import type { MissingTokenKey } from "./missing-token-key.ts";
import type { TokenAuthenticationFailed } from "./token-authentication-failed.ts";
import type { UnknownTokenKey } from "./unknown-token-key.ts";

/**
 * A channel token as stored: encrypted, and starting with the id of the key
 * that encrypted it (`<keyId>.…`), so keys can rotate while older tokens
 * still decrypt.
 */
export const EncryptedTokenSchema = Schema.NonEmptyString.pipe(
  Schema.brand("EncryptedToken")
);

export type EncryptedToken = typeof EncryptedTokenSchema.Type;

/**
 * The id of the key a stored token was encrypted with: what comes before its
 * first dot. Kept beside the tokens, it lets a rotation find the ones still
 * encrypted with an older key.
 */
export const tokenKeyIdOf = (encrypted: EncryptedToken): string => {
  const [keyId = encrypted] = encrypted.split(".", 1);

  return keyId;
};

export type TokenDecryptionError =
  | MalformedEncryptedToken
  | TokenAuthenticationFailed
  | UnknownTokenKey;

/**
 * Encrypts channel tokens at rest. The channel id is authenticated with each
 * token, as additional data, so a token copied to another channel's row does
 * not decrypt.
 *
 * A server may run without keys, as long as it stores no channel: encrypting
 * then fails with MissingTokenKey, and decrypting with UnknownTokenKey.
 */
export class TokenCipher extends Context.Service<
  TokenCipher,
  {
    readonly encrypt: (
      token: Redacted.Redacted,
      channelId: ChannelId
    ) => Effect.Effect<EncryptedToken, MissingTokenKey>;
    readonly decrypt: (
      encrypted: EncryptedToken,
      channelId: ChannelId
    ) => Effect.Effect<Redacted.Redacted, TokenDecryptionError>;
  }
>()("acme-server/channels/application/TokenCipher") {}
