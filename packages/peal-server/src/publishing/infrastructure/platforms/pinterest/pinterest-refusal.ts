import { DateTime, Effect, Option } from "effect";
import type { HttpClientResponse } from "effect/http";

import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { pinterestErrorCodeOf } from "#shared/infrastructure/platforms/pinterest-api.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

export type PinterestRefusal = PublishFailure | TokenRejected;

/**
 * What Pinterest's refusal of a call means, from its status and whether
 * the body is Pinterest's own error (a numeric `code` and a `message`):
 *
 * - 5xx: Pinterest down, for now.
 * - 429: a rate limit, for as long as `x-ratelimit-reset` says when it
 *   does. Limits are per user and per minute for an app with Standard
 *   access, per app and per day with Trial access.
 * - 401 with Pinterest's error: the token, expired or invalid, which a
 *   renewal or a reconnection replaces. A 401 or 403 that is not
 *   Pinterest's own came from a server on the way: unavailable, never a
 *   reason to ask for the account again.
 * - Anything else: Pinterest refused what was sent (a board that is gone
 *   or not the account's, a field it does not take, a scope the token
 *   lacks), kept as `pinterest<code>`: the video or image itself when the
 *   call was about `media`, the Pin otherwise.
 */
export const refusalOf = (
  response: HttpClientResponse.HttpClientResponse,
  about: "media" | "pin"
): Effect.Effect<PinterestRefusal> =>
  Effect.gen(function* refusing() {
    const { status } = response;

    if (status >= 500) {
      return new PlatformUnavailable();
    }

    if (status === 429) {
      const now = yield* DateTime.now;

      return Option.match(retryAfterOf(response.headers, now), {
        onNone: () => new RateLimited({}),
        onSome: (retryAfter) => new RateLimited({ retryAfter }),
      });
    }

    const pinterestCode = yield* pinterestErrorCodeOf(response);

    if (Option.isNone(pinterestCode)) {
      return status === 401 || status === 403
        ? new PlatformUnavailable()
        : new BadRequest({ code: `http${status}` });
    }

    if (status === 401) {
      return new TokenRejected();
    }

    const code = `pinterest${pinterestCode.value}`;

    return about === "media"
      ? new MediaRejected({ code })
      : new BadRequest({ code });
  });

/** Fails with what Pinterest's refusal means. */
export const refused = (
  response: HttpClientResponse.HttpClientResponse,
  about: "media" | "pin"
): Effect.Effect<never, PinterestRefusal> =>
  refusalOf(response, about).pipe(Effect.flatMap(Effect.fail));
