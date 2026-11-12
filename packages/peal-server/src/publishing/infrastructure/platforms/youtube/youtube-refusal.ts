import { DateTime, Effect, Option } from "effect";
import type { HttpClientResponse } from "effect/http";

import { dailyLimitCodes } from "#publishing/domain/own-refusals.ts";
import { codeOf } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { googleReasonOf } from "#shared/infrastructure/platforms/google-refusal.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";
import { untilQuotaReset } from "#shared/infrastructure/platforms/youtube-quota-day.ts";

export type YouTubeRefusal = PublishFailure | TokenRejected;

/** Why YouTube refused a call, and that the project's quota is spent. */
export interface Refused {
  readonly failure: YouTubeRefusal;
  /** YouTube said the project's quota is spent for the day. */
  readonly quotaSpent: boolean;
}

// The reasons that refuse the token itself: renewing it, or reconnecting,
// may help.
const tokenReasons: ReadonlySet<string> = new Set([
  "authError",
  "insufficientPermissions",
]);

// Rate limits of the moment, rather than of the day.
const rateReasons: ReadonlySet<string> = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
]);

// What a refusal of a video's file, rather than its metadata, is called.
const mediaReasons: ReadonlySet<string> = new Set([
  "invalidFilename",
  "mediaBodyRequired",
]);

const refusedFor = (failure: YouTubeRefusal, quotaSpent = false): Refused => ({
  failure,
  quotaSpent,
});

const untilReset = DateTime.now.pipe(Effect.map(untilQuotaReset));

/**
 * What YouTube's refusal means, from its status and `errors[].reason`, per
 * the YouTube Data API's errors:
 *
 * - `quotaExceeded` (403): the project's daily quota is spent; and
 *   `uploadLimitExceeded` (400): the account uploaded all it may today.
 *   Both wait until the quotas reset, at midnight Pacific Time.
 * - `rateLimitExceeded`, `userRateLimitExceeded` and 429: a rate limit,
 *   for as long as the answer says.
 * - 401, `authError` and `insufficientPermissions`: the token, which a
 *   renewal or a reconnection replaces; `youtubeSignupRequired` (401): the
 *   Google account has no channel, which no token fixes.
 * - 5xx: YouTube down, for now.
 * - Anything else: the video or its metadata refused (`invalidTitle`,
 *   `invalidDescription`, `invalidTags`, `invalidCategoryId`,
 *   `forbiddenPrivacySetting`…), kept as the code.
 */
export const refusalOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<Refused> =>
  Effect.gen(function* refusing() {
    const { status } = response;

    if (status >= 500) {
      return refusedFor(new PlatformUnavailable());
    }

    const reason = yield* googleReasonOf(response);
    const named = Option.getOrElse(reason, () => "");
    const now = yield* DateTime.now;

    if (named === dailyLimitCodes.projectQuota) {
      return refusedFor(
        new RateLimited({ code: named, retryAfter: yield* untilReset }),
        true
      );
    }

    if (named === dailyLimitCodes.accountUploads) {
      return refusedFor(
        new RateLimited({ code: named, retryAfter: yield* untilReset })
      );
    }

    if (status === 429 || rateReasons.has(named)) {
      return refusedFor(
        Option.match(retryAfterOf(response.headers, now), {
          onNone: () => new RateLimited({}),
          onSome: (retryAfter) => new RateLimited({ retryAfter }),
        })
      );
    }

    if (
      (status === 401 && named !== "youtubeSignupRequired") ||
      tokenReasons.has(named)
    ) {
      return refusedFor(new TokenRejected());
    }

    const code = codeOf(reason, `http${status}`);

    return refusedFor(
      mediaReasons.has(named)
        ? new MediaRejected({ code })
        : new BadRequest({ code })
    );
  });
