import { Effect, Option, Redacted, Schema } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";
import { HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

// Helpers for the OAuth 2 flows of platforms on hosts of their own (LinkedIn,
// X): the request goes through the public HTTP client, an answer that is not
// a success is the platform down (5xx, 429) or refusing (anything else).

/** The HTTP client the authorizers send through: the public one. */
export type AuthorizerHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export type ExchangeFailure = AuthorizationFailed | PlatformUnavailable;

/**
 * An OAuth error answer (RFC 6749, 5.2), read for its code: the description
 * may quote what was sent, so it is never kept.
 */
export const OAuthErrorSchema = Schema.Struct({
  error: Schema.optionalKey(Schema.String),
});

/** A token answer (RFC 6749, 5.1). */
export const TokenAnswerSchema = Schema.Struct({
  access_token: Schema.NonEmptyString,
  expires_in: Schema.optionalKey(Schema.Number),
  refresh_token: Schema.optionalKey(Schema.NonEmptyString),
  scope: Schema.optionalKey(Schema.String),
});

export type TokenAnswer = typeof TokenAnswerSchema.Type;

const isTransient = (status: number) => status >= 500 || status === 429;

/** The platform's OAuth error code in a refusal, if it sent one. */
export const oauthErrorOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<Option.Option<string>> =>
  HttpClientResponse.schemaBodyJson(OAuthErrorSchema)(response).pipe(
    Effect.map(({ error }) => Option.fromUndefinedOr(error)),
    Effect.orElseSucceed(() => Option.none<string>())
  );

/**
 * The body of a successful answer as `schema`. Anything else fails: as the
 * platform down for a server error or a rate limit, as its refusal otherwise,
 * with the OAuth error code when it gave one.
 */
export const bodyOf =
  <A, I>(what: string, schema: Schema.Codec<A, I>) =>
  (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<A, ExchangeFailure> => {
    if (response.status >= 200 && response.status < 300) {
      return HttpClientResponse.schemaBodyJson(schema)(response).pipe(
        Effect.mapError(
          () =>
            new AuthorizationFailed({
              reason: `${what} sent an unexpected answer`,
            })
        )
      );
    }

    if (isTransient(response.status)) {
      return Effect.fail(new PlatformUnavailable());
    }

    return oauthErrorOf(response).pipe(
      Effect.flatMap((code) =>
        Effect.fail(
          new AuthorizationFailed({
            reason: `${what} answered ${response.status}${Option.match(code, {
              onNone: () => "",
              onSome: (error) => ` (${error.slice(0, 64)})`,
            })}`,
          })
        )
      )
    );
  };

/**
 * A request that got no answer: the platform could not be reached. Its
 * hosts are fixed, so the guard refuses them only when their names do not
 * resolve for now.
 */
export const exchanged = <A>(
  request: Effect.Effect<
    A,
    ExchangeFailure | HttpClientError.HttpClientError | OutboundRequestRefused
  >
): Effect.Effect<A, ExchangeFailure> =>
  request.pipe(
    Effect.catchTags({
      HttpClientError: () => Effect.fail(new PlatformUnavailable()),
      OutboundRequestRefused: () => Effect.fail(new PlatformUnavailable()),
    })
  );

/** Text from 32 random bytes, for states and PKCE verifiers. */
export const randomTexts = Effect.gen(function* randomTexts() {
  const random = yield* SecureRandom.SecureRandom;

  return random
    .randomBytes(32)
    .pipe(Effect.map((bytes) => Base64Url.encode(bytes)));
});

const encoder = new TextEncoder();

/** The PKCE challenge of a verifier (RFC 7636, S256). */
export const pkceChallenges = Effect.gen(function* pkceChallenges() {
  const digest = yield* Digest.Digest;

  return (verifier: Redacted.Redacted) =>
    digest
      .digest(Digest.sha256, encoder.encode(Redacted.value(verifier)))
      .pipe(Effect.map((hash) => Base64Url.encode(hash)));
});

/** The scopes a token answer granted, or those asked for when it says none. */
export const scopesOf = (
  answer: TokenAnswer,
  asked: readonly string[]
): readonly string[] =>
  Option.fromUndefinedOr(answer.scope).pipe(
    Option.map((scope) => scope.split(/[\s,]+/u).filter((s) => s !== "")),
    Option.filter((granted) => granted.length > 0),
    Option.getOrElse(() => asked)
  );
