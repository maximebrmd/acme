import { Duration, Option } from "effect";
import type { DateTime } from "effect";
import type { HttpClientResponse } from "effect/http";

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

const rejected = (call: MastodonCall, code: string): PublishFailure =>
  call === "media" ? new MediaRejected({ code }) : new BadRequest({ code });

/**
 * What an answer that is not a success means, from Mastodon's API
 * reference: 401 is a token the instance does not know (revoked, as its
 * tokens never expire), 403 one without the scope or an account the
 * instance restricted: either is a refused token, which only reconnecting
 * fixes on Mastodon; 413 and 422 refuse the
 * file or the post as sent; 429 is the rate limit, whose reset time the
 * instance gives in X-RateLimit-Reset. A server error on the post itself
 * leaves its fate unknown; on anything else, it is the instance being down.
 * Error messages are not kept, as they may quote the post.
 */
const refusal = (
  call: MastodonCall,
  response: HttpClientResponse.HttpClientResponse,
  now: DateTime.Utc
): OutcomeUnknown | PublishFailure | TokenRejected => {
  const { status } = response;

  // Both refuse the call before it does anything: the channels context
  // renews the token, and asks for a reconnect when that does not help.
  if (status === 401 || status === 403) {
    return new TokenRejected();
  }

  if (status === 429) {
    const retryAfter = retryAfterOf(response.headers, now);

    return Option.isSome(retryAfter) && !Duration.isZero(retryAfter.value)
      ? new RateLimited({ retryAfter: retryAfter.value })
      : new RateLimited({});
  }

  if (status >= 500) {
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
};

/** An upload, or a look at an upload, that the instance refused. */
export const mediaRefusal = (
  response: HttpClientResponse.HttpClientResponse,
  now: DateTime.Utc
): PublishFailure | TokenRejected => {
  const found = refusal("media", response, now);

  return found._tag === "OutcomeUnknown" ? new PlatformUnavailable() : found;
};

/** The post, as the instance answered it when it did not take it. */
export const statusRefusal = (
  response: HttpClientResponse.HttpClientResponse,
  now: DateTime.Utc
): OutcomeUnknown | PublishFailure | TokenRejected =>
  refusal("status", response, now);
