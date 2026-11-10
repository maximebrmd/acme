import { DateTime, Duration, Effect, Option, Schema } from "effect";
import { HttpClientResponse } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

// Which call was refused: an upload or a look at media (`media`), or the
// post itself (`status`), which may have gone live when the instance fails.
type MastodonCall = "media" | "status";

type MastodonRefusal = OutcomeUnknown | PublishFailure | TokenRejected;

// How Mastodon refuses a token: a JSON error. A page from something on the
// way, such as a proxy's challenge, says nothing of the token.
const errorOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({ error: Schema.String })
);

const isMastodonError = (response: HttpClientResponse.HttpClientResponse) =>
  errorOf(response).pipe(Effect.option, Effect.map(Option.isSome));

const rejected = (call: MastodonCall, code: string): PublishFailure =>
  call === "media" ? new MediaRejected({ code }) : new BadRequest({ code });

/**
 * What an answer that is not a success means, from Mastodon's API
 * reference: 401 is a token the instance does not know (revoked, as its
 * tokens never expire), 403 one without the scope or an account the
 * instance restricted: either, with Mastodon's JSON error, is a refused
 * token, which only reconnecting fixes on Mastodon; without it, something
 * on the way refused the call before the instance saw it, and the instance
 * may answer later. 413 and 422 refuse the file or the post as sent; 429 is
 * the rate limit, whose reset time the instance gives in X-RateLimit-Reset.
 * A server error on the post itself leaves its fate unknown; on anything
 * else, it is the instance being down. A 408 is read as one: the request
 * timed out on the way, whatever it carried. Error messages are not kept, as they
 * may quote the post.
 */
const refusal = Effect.fn("MastodonRefusal.of")(function* refusal(
  call: MastodonCall,
  response: HttpClientResponse.HttpClientResponse
) {
  const { status } = response;

  if (status === 401 || status === 403) {
    // Mastodon's refusal comes before the call does anything: the channels
    // context renews the token, and asks for a reconnect when that does not
    // help, which stops the channel's publishing, so a proxy's page must
    // not.
    return (yield* isMastodonError(response))
      ? new TokenRejected()
      : new PlatformUnavailable();
  }

  if (status === 429) {
    const retryAfter = retryAfterOf(response.headers, yield* DateTime.now);

    return Option.isSome(retryAfter) && !Duration.isZero(retryAfter.value)
      ? new RateLimited({ retryAfter: retryAfter.value })
      : new RateLimited({});
  }

  // 408: a server on the way gave up waiting for the request, as for a
  // file's bytes: it did nothing with it, and the file is not at fault.
  if (status >= 500 || status === 408) {
    return call === "status"
      ? new OutcomeUnknown({ reason: "noResponse" })
      : new PlatformUnavailable();
  }

  if (status === 404) {
    return rejected(call, "notFound");
  }

  if (status === 413) {
    return rejected(call, "tooLarge");
  }

  return rejected(call, status === 422 ? "unprocessable" : `http${status}`);
});

/** An upload, or a look at an upload, that the instance refused. */
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

/** The post, as the instance answered it when it did not take it. */
export const statusRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, MastodonRefusal> =>
  refusal("status", response).pipe(Effect.flatMap(Effect.fail));
