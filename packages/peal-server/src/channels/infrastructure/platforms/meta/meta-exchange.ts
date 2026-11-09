import { Effect, Match } from "effect";
import type { Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError, UrlParams } from "effect/http";

import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { graphRefusalOf } from "#shared/infrastructure/platforms/graph-refusal.ts";
import type { GraphRefusal } from "#shared/infrastructure/platforms/graph-refusal.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

/** The HTTP client the Meta authorizers send through: the public one. */
export type MetaHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

/**
 * What a Meta call made while connecting an account came to, short of the
 * answer: the platform refused it (`refused`, with the reason), or did not
 * answer usefully (`unavailable`).
 */
export type ExchangeFailure =
  | { readonly _tag: "refused"; readonly refusal: GraphRefusal }
  | { readonly _tag: "unavailable" };

const unavailable: ExchangeFailure = { _tag: "unavailable" };

/**
 * Sends a request to Meta and reads its JSON answer with `schema`. A
 * transport failure, an unreadable answer, or a Meta host the outbound guard
 * could not resolve is `unavailable`; any answer that is not a success is
 * classified as Meta's refusal.
 */
export const exchange = <A, I>(
  http: MetaHttp,
  request: HttpClientRequest.HttpClientRequest,
  schema: Schema.Codec<A, I>
): Effect.Effect<A, ExchangeFailure> =>
  http.execute(request).pipe(
    Effect.flatMap((response) =>
      response.status >= 200 && response.status < 300
        ? HttpClientResponse.schemaBodyJson(schema)(response).pipe(
            Effect.mapError(() => unavailable)
          )
        : graphRefusalOf(response).pipe(
            Effect.flatMap((refusal) =>
              Effect.fail<ExchangeFailure>({ _tag: "refused", refusal })
            )
          )
    ),
    Effect.catchTags({
      HttpClientError: () => Effect.fail(unavailable),
      OutboundRequestRefused: () => Effect.fail(unavailable),
    })
  );

/** A GET with query parameters; Redacted ones stay out of traces. */
export const getWith = (url: URL, params: UrlParams.Input) =>
  HttpClientRequest.get(url).pipe(HttpClientRequest.setUrlParams(params));

/** A POST with a form body. */
export const postForm = (url: URL, params: UrlParams.Input) =>
  HttpClientRequest.post(url).pipe(HttpClientRequest.bodyUrlParams(params));

/**
 * The failure of a sign-in step: Meta refusing what it was sent (a code
 * already used or expired, an app misconfigured) is the sign-in failing,
 * with Meta's reason for the logs; Meta busy or down is for later.
 */
export const signInFailure =
  (what: string) =>
  (failure: ExchangeFailure): AuthorizationFailed | PlatformUnavailable =>
    Match.valueTags(failure, {
      refused: ({ refusal }) =>
        Match.valueTags(refusal, {
          duplicate: () =>
            new AuthorizationFailed({ reason: `${what} was a duplicate` }),
          rateLimited: () => new PlatformUnavailable(),
          refused: ({ code }) =>
            new AuthorizationFailed({ reason: `${what} answered ${code}` }),
          token: () =>
            new AuthorizationFailed({ reason: `${what} refused the token` }),
          unavailable: () => new PlatformUnavailable(),
        }),
      unavailable: () => new PlatformUnavailable(),
    });

/**
 * The failure of a token refresh: Meta busy or down is for later; any
 * refusal means the token can no longer be renewed, and the user
 * reconnects.
 */
export const refreshFailure = (
  failure: ExchangeFailure
): PlatformUnavailable | TokenExpired =>
  failure._tag === "unavailable" ||
  failure.refusal._tag === "unavailable" ||
  failure.refusal._tag === "rateLimited"
    ? new PlatformUnavailable()
    : new TokenExpired();
