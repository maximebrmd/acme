import { DateTime, Effect, Option, Redacted } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";
import { Headers, HttpClientRequest } from "effect/http";
import type {
  HttpClient,
  HttpClientError,
  HttpClientResponse,
} from "effect/http";

import { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

import type { BlueskySession } from "./bluesky-session.ts";

/** The HTTP client calls go through: the public one. */
export type BlueskyHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

const encoder = new TextEncoder();

// The URL a proof names: without its query or fragment (RFC 9449, 4.2).
const htuOf = (url: string) => {
  const parsed = new URL(url);

  return `${parsed.origin}${parsed.pathname}`;
};

// A resource server asks for a nonce with 401 and this error (RFC 9449, 9).
const wantsNonce = (response: HttpClientResponse.HttpClientResponse) =>
  response.status === 401 &&
  Headers.get(response.headers, "www-authenticate").pipe(
    Option.exists(
      (challenge) =>
        challenge.startsWith("DPoP") &&
        challenge.includes('error="use_dpop_nonce"')
    )
  );

/**
 * Sends requests to a PDS with a session's access token, each bound to the
 * session's key by a DPoP proof (RFC 9449): the proof names the method and
 * URL, hashes the token, and carries the nonce the server last gave. A
 * server that wants a newer nonce refuses the request before acting on it,
 * so the request is sent once more with that nonce. Nonces are kept per
 * server for the life of the sender.
 */
export const dpopSender = Effect.fn("BlueskyDpop.make")(function* dpopSender(
  http: BlueskyHttp
) {
  const random = yield* SecureRandom.SecureRandom;
  const digest = yield* Digest.Digest;
  const nonces = new Map<string, string>();

  const proofFor = Effect.fn("BlueskyDpop.proof")(function* proofFor(
    session: BlueskySession,
    request: HttpClientRequest.HttpClientRequest,
    nonce: Option.Option<string>
  ) {
    const jwk = session.dpopKey.bareJwk;

    if (jwk === undefined) {
      return yield* new TokenRejected();
    }

    const ath = Base64Url.encode(
      yield* digest.digest(
        Digest.sha256,
        encoder.encode(Redacted.value(session.accessToken))
      )
    );

    const jti = Base64Url.encode(yield* random.randomBytes(16));
    const now = yield* DateTime.now;

    const claims = {
      ath,
      htm: request.method,
      htu: htuOf(request.url),
      iat: Math.floor(DateTime.toEpochMillis(now) / 1000),
      jti,
    };

    return yield* Effect.tryPromise({
      // A key that cannot sign leaves the session unusable: renewing it
      // gives a new key.
      catch: () => new TokenRejected(),
      try: async () =>
        await session.dpopKey.createJwt(
          { alg: "ES256", jwk, typ: "dpop+jwt" },
          Option.match(nonce, {
            onNone: () => claims,
            onSome: (value) => ({ ...claims, nonce: value }),
          })
        ),
    });
  });

  const attempt = Effect.fn("BlueskyDpop.attempt")(function* attempt(
    session: BlueskySession,
    request: HttpClientRequest.HttpClientRequest
  ) {
    const { origin } = new URL(request.url);
    const sentNonce = Option.fromUndefinedOr(nonces.get(origin));
    const proof = yield* proofFor(session, request, sentNonce);

    const response = yield* http.execute(
      request.pipe(
        HttpClientRequest.setHeaders({
          authorization: `DPoP ${Redacted.value(session.accessToken)}`,
          dpop: proof,
        })
      )
    );

    const nextNonce = Headers.get(response.headers, "dpop-nonce");

    if (Option.isSome(nextNonce)) {
      nonces.set(origin, nextNonce.value);
    }

    const fresh =
      Option.isSome(nextNonce) && !Option.contains(sentNonce, nextNonce.value);

    return { fresh, response };
  });

  /** Sends `request` for `session`, with a fresh nonce if the server asks. */
  const send = Effect.fn("BlueskyDpop.send")(function* send(
    session: BlueskySession,
    request: HttpClientRequest.HttpClientRequest
  ) {
    const first = yield* attempt(session, request);

    if (!first.fresh || !wantsNonce(first.response)) {
      return first.response;
    }

    const second = yield* attempt(session, request);

    return second.response;
  });

  return { send };
});
