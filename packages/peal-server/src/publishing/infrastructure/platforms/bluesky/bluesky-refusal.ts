import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { HttpClientResponse } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import { codeOf } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

/** An XRPC error's body: the error's name, and a message for people. */
export const XrpcErrorSchema = Schema.Struct({
  error: Schema.optionalKey(Schema.String),
  message: Schema.optionalKey(Schema.String),
});

// Which call was refused: one about media (an upload, a service token, a
// video job), or the post's record, which may exist when the server fails.
type BlueskyCall = "media" | "record";

// Names a PDS gives a token it will not take any more.
const tokenErrors: ReadonlySet<string> = new Set([
  "ExpiredToken",
  "InvalidToken",
]);

/** The XRPC error's name, if the body gives one. */
export const errorNameOf = (response: HttpClientResponse.HttpClientResponse) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(XrpcErrorSchema)),
    Effect.map(({ error }) => Option.fromUndefinedOr(error)),
    Effect.orElseSucceed(() => Option.none<string>())
  );

const rejected = (call: BlueskyCall, code: string): PublishFailure =>
  call === "media" ? new MediaRejected({ code }) : new BadRequest({ code });

const refusal = Effect.fn("BlueskyRefusal.of")(function* refusal(
  call: BlueskyCall,
  response: HttpClientResponse.HttpClientResponse
) {
  const { status } = response;

  // A token the PDS will not take, or a session without the scope or for
  // an account taken down: renewing the session may help, and reconnecting
  // is asked for when it does not.
  if (status === 401 || status === 403) {
    return new TokenRejected();
  }

  if (status === 429) {
    const retryAfter = retryAfterOf(response.headers, yield* DateTime.now);

    return Option.isSome(retryAfter) && !Duration.isZero(retryAfter.value)
      ? new RateLimited({ retryAfter: retryAfter.value })
      : new RateLimited({});
  }

  if (status >= 500) {
    return call === "record"
      ? new OutcomeUnknown({ reason: "noResponse" })
      : new PlatformUnavailable();
  }

  if (status === 413) {
    return rejected(call, "tooLarge");
  }

  const name = yield* errorNameOf(response);

  if (Option.exists(name, (found) => tokenErrors.has(found))) {
    return new TokenRejected();
  }

  return rejected(
    call,
    codeOf(name, status === 400 ? "InvalidRequest" : `http${status}`)
  );
});

/**
 * What an XRPC answer that is not a success means, from the AT Protocol's
 * error conventions: 401 (after the DPoP nonce was given), 403 (a session
 * without the scope) or an expired or invalid token is a refused token,
 * renewed once before asking for a reconnect; 429 the rate limit, whose
 * reset the server
 * gives in RateLimit-Reset; other 4xx refuse what was sent, named by the
 * XRPC error. A server error on a media call is the server being down.
 * Messages are not kept, as they may quote the post.
 */
export const mediaRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, PublishFailure | TokenRejected> =>
  refusal("media", response).pipe(
    Effect.flatMap((found) =>
      Effect.fail(
        found._tag === "OutcomeUnknown" ? new PlatformUnavailable() : found
      )
    )
  );

/**
 * The same for the post's record, where a server error leaves its fate
 * unknown: a PDS answers 500 to a second create with the same record key.
 */
export const recordRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, OutcomeUnknown | PublishFailure | TokenRejected> =>
  refusal("record", response).pipe(
    Effect.flatMap((found) => Effect.fail(found))
  );
