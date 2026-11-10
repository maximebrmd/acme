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

/**
 * What a secret that belongs to no channel is bound to, as its additional
 * data: a copy moved under another context does not decrypt.
 */
export const SecretContextSchema = Schema.String.check(
  Schema.isPattern(/^(?:ads|app|choice|connect|webhook):\S+$/u)
).pipe(Schema.brand("SecretContext"));

export type SecretContext = typeof SecretContextSchema.Type;

/** The context of a connection's secret, named by its state. */
export const connectAttemptContext = (state: string): SecretContext =>
  SecretContextSchema.make(`connect:${state}`);

/** The context of the accounts a member is offered, named by its selection. */
export const choiceContext = (selection: string): SecretContext =>
  SecretContextSchema.make(`choice:${selection}`);

/** The context of an app's client secret on a server. */
export const appSecretContext = (origin: string): SecretContext =>
  SecretContextSchema.make(`app:${origin}`);

/** The context of a webhook endpoint's signing secret, named by its id. */
export const webhookSecretContext = (endpointId: string): SecretContext =>
  SecretContextSchema.make(`webhook:${endpointId}`);

/** The context of an ad network grant's token, named by the grant's id. */
export const adGrantContext = (grantId: string): SecretContext =>
  SecretContextSchema.make(`ads:${grantId}`);

export type TokenDecryptionError =
  | MalformedEncryptedToken
  | TokenAuthenticationFailed
  | UnknownTokenKey;

/**
 * Encrypts channel tokens at rest. The channel id is authenticated with each
 * token, as additional data, so a token copied to another channel's row does
 * not decrypt.
 *
 * Secrets that belong to no channel, such as a connection's PKCE verifier or
 * an app's client secret on a Mastodon instance, are encrypted the same way,
 * bound to a context of their own (`connect:<state>`, `choice:<selection>`,
 * `app:<origin>`, `webhook:<endpoint id>`, `ads:<grant id>`), which never
 * reads as a channel id.
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
    readonly encryptSecret: (
      secret: Redacted.Redacted,
      context: SecretContext
    ) => Effect.Effect<EncryptedToken, MissingTokenKey>;
    readonly decryptSecret: (
      encrypted: EncryptedToken,
      context: SecretContext
    ) => Effect.Effect<Redacted.Redacted, TokenDecryptionError>;
  }
>()("peal-server/channels/application/TokenCipher") {}
