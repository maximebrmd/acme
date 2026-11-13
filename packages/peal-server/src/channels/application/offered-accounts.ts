import { Effect, Option, Redacted, Schema } from "effect";

import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";

import type { AuthorizedAccount } from "./platform-authorizer.ts";

// The accounts of a choice, with their tokens, as they are kept encrypted
// until the member chooses.
const OfferedAccountSchema = Schema.Struct({
  accountId: Schema.NonEmptyString,
  avatarUrl: Schema.Option(AvatarUrlSchema),
  displayName: Schema.Option(Schema.String),
  handle: Schema.NonEmptyString,
  tokens: Schema.Struct({
    accessToken: Schema.String,
    expiresAt: Schema.Option(Schema.DateTimeUtc),
    grantedBy: Schema.Option(Schema.NonEmptyString),
    refreshToken: Schema.Option(Schema.String),
    renewable: Schema.Boolean,
    scopes: Schema.Array(Schema.String),
    tokenOwner: Schema.optionalKey(Schema.NonEmptyString),
  }),
});

const OfferedAccountsJson = Schema.fromJsonString(
  Schema.toCodecJson(Schema.Array(OfferedAccountSchema))
);

const encode = Schema.encodeEffect(OfferedAccountsJson);

const decode = Schema.decodeUnknownEffect(OfferedAccountsJson);

type OfferedAccount = typeof OfferedAccountSchema.Type;

const offeredOf = (account: AuthorizedAccount): OfferedAccount => ({
  accountId: account.accountId,
  avatarUrl: account.avatarUrl,
  displayName: account.displayName,
  handle: account.handle,
  tokens: {
    accessToken: Redacted.value(account.tokens.accessToken),
    expiresAt: account.tokens.expiresAt,
    grantedBy: Option.fromUndefinedOr(account.tokens.grantedBy),
    refreshToken: account.tokens.refreshToken.pipe(Option.map(Redacted.value)),
    renewable: account.tokens.renewable,
    scopes: account.tokens.scopes,
    ...Option.match(Option.fromUndefinedOr(account.tokens.tokenOwner), {
      onNone: () => ({}),
      onSome: (tokenOwner) => ({ tokenOwner }),
    }),
  },
});

const authorizedOf = ({ tokens, ...account }: OfferedAccount) => {
  const authorized: AuthorizedAccount = {
    ...account,
    tokens: {
      accessToken: Redacted.make(tokens.accessToken),
      expiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken.pipe(Option.map(Redacted.make)),
      renewable: tokens.renewable,
      scopes: tokens.scopes,
      ...Option.match(tokens.grantedBy, {
        onNone: () => ({}),
        onSome: (grantedBy) => ({ grantedBy }),
      }),
      ...Option.match(Option.fromUndefinedOr(tokens.tokenOwner), {
        onNone: () => ({}),
        onSome: (tokenOwner) => ({ tokenOwner }),
      }),
    },
  };

  return authorized;
};

/**
 * The accounts as one secret, to encrypt: their tokens are in it. Failing
 * to encode accounts the platform adapters built is a bug.
 */
export const sealOffered = (
  accounts: readonly AuthorizedAccount[]
): Effect.Effect<Redacted.Redacted> =>
  encode(accounts.map(offeredOf)).pipe(
    Effect.map((json) => Redacted.make(json)),
    Effect.orDie
  );

/**
 * The accounts back from their secret. This server wrote it a few minutes
 * ago: one it cannot read is a bug.
 */
export const openOffered = (
  sealed: Redacted.Redacted
): Effect.Effect<readonly AuthorizedAccount[]> =>
  decode(Redacted.value(sealed)).pipe(
    Effect.map((accounts) => accounts.map(authorizedOf)),
    Effect.orDie
  );
