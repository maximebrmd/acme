import { Context, Schema } from "effect";
import type { Effect, Redacted } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

import type { MalformedEncryptedToken } from "./malformed-encrypted-token.ts";
import type { TokenAuthenticationFailed } from "./token-authentication-failed.ts";
import type { UnknownTokenKey } from "./unknown-token-key.ts";

/**
 * A channel token as stored: encrypted, and carrying the id of the key that
 * encrypted it, so keys can rotate while older tokens still decrypt.
 */
export const EncryptedTokenSchema = Schema.NonEmptyString.pipe(
  Schema.brand("EncryptedToken")
);

export type EncryptedToken = typeof EncryptedTokenSchema.Type;

export type TokenDecryptionError =
  | MalformedEncryptedToken
  | TokenAuthenticationFailed
  | UnknownTokenKey;

/**
 * Encrypts channel tokens at rest. The channel id is authenticated with each
 * token, as additional data, so a token copied to another channel's row does
 * not decrypt.
 */
export class TokenCipher extends Context.Service<
  TokenCipher,
  {
    readonly encrypt: (
      token: Redacted.Redacted,
      channelId: ChannelId
    ) => Effect.Effect<EncryptedToken>;
    readonly decrypt: (
      encrypted: EncryptedToken,
      channelId: ChannelId
    ) => Effect.Effect<Redacted.Redacted, TokenDecryptionError>;
  }
>()("acme-server/channels/application/TokenCipher") {}
