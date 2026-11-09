import { DateTime, Duration, Effect, Option } from "effect";
import type { HttpClientResponse } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import { platformRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { codeOf } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";
import {
  scopeRefusalCodes,
  tiktokErrorCodeOf,
  tokenRefusalCodes,
} from "#shared/infrastructure/platforms/tiktok-api.ts";

/**
 * Which call TikTok refused: one that changes nothing anyone sees (`read`:
 * creator info, a post's status; `upload`: starting a FILE_UPLOAD, which
 * goes live only once every byte is up), or one that makes the post live
 * (`post`: a PULL_FROM_URL init, which TikTok publishes once it has the
 * media), whose outcome is unknown when TikTok fails.
 */
export type TikTokCall = "post" | "read" | "upload";

/** How TikTok refuses a call: never for its media, which its status tells. */
export type TikTokRefusal =
  | BadRequest
  | OutcomeUnknown
  | PlatformUnavailable
  | RateLimited
  | TokenExpired
  | TokenRejected;

// TikTok's posting caps last a day: the creator's posts, its count of
// creators who post through the app, a creator's pending uploads. The
// publication policy keeps trying, an hour apart, for its day.
const dailyCaps: ReadonlySet<string> = new Set([
  "reached_active_user_cap",
  "spam_risk_too_many_pending_share",
  "spam_risk_too_many_posts",
]);

const capWait = Duration.hours(1);

/** A day's cap reached: try again in an hour. */
export const cappedFor = (): RateLimited =>
  new RateLimited({ retryAfter: capWait });

// The media checks TikTok's processing fails on (fail_reason).
const mediaReasons: ReadonlySet<string> = new Set([
  "duration_check_failed",
  "file_format_check_failed",
  "frame_rate_check_failed",
  "picture_size_check_failed",
]);

// Failures TikTok says may pass if tried again: its own trouble, or a
// download of the media that did not finish within its hour.
const passingReasons: ReadonlySet<string> = new Set([
  "internal",
  "photo_pull_failed",
  "video_pull_failed",
]);

/**
 * Why a post TikTok processed failed, from its status's `fail_reason`
 * ("Get Post Status"). Nothing went live: each is a refusal.
 */
export const processingFailure = (
  reason: Option.Option<string>
): PublishFailure => {
  const named = Option.getOrElse(reason, () => "");

  if (mediaReasons.has(named)) {
    return new MediaRejected({ code: named });
  }

  if (passingReasons.has(named)) {
    return new PlatformUnavailable();
  }

  // The creator removed Acme's access while TikTok processed the post.
  if (named === "auth_removed") {
    return new TokenExpired();
  }

  if (named === "spam_risk_too_many_posts") {
    return cappedFor();
  }

  return new BadRequest({ code: codeOf(reason, "publishFailed") });
};

const refusalWith = (
  call: TikTokCall,
  response: HttpClientResponse.HttpClientResponse,
  code: Option.Option<string>,
  now: DateTime.Utc
): TikTokRefusal => {
  const { status } = response;
  const named = Option.getOrElse(code, () => "");

  // The token expired or was revoked, before anything happened: the
  // channels context renews it.
  if (tokenRefusalCodes.has(named) || (status === 401 && Option.isNone(code))) {
    return new TokenRejected();
  }

  // The creator did not grant what posting needs: only reconnecting can.
  if (scopeRefusalCodes.has(named)) {
    return new TokenExpired();
  }

  if (status === 429 || named === "rate_limit_exceeded") {
    return Option.match(retryAfterOf(response.headers, now), {
      onNone: () => new RateLimited({}),
      onSome: (wait) =>
        Duration.isZero(wait)
          ? new RateLimited({})
          : new RateLimited({ retryAfter: wait }),
    });
  }

  if (status >= 500) {
    return call === "post"
      ? new OutcomeUnknown({ reason: "noResponse" })
      : new PlatformUnavailable();
  }

  if (dailyCaps.has(named)) {
    return cappedFor();
  }

  if (named === "unaudited_client_can_only_post_to_private_accounts") {
    return new BadRequest({ code: platformRefusalCodes.appNotAudited });
  }

  return new BadRequest({ code: codeOf(code, `http${status}`) });
};

/**
 * What TikTok's refusal of a call means, from its v2 error codes ("API v2
 * Error Handling" and each endpoint's own). An answer that is not a
 * success, or whose error code is not "ok", is one.
 */
export const tiktokRefusal = (
  call: TikTokCall,
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, TikTokRefusal> =>
  Effect.all([tiktokErrorCodeOf(response), DateTime.now]).pipe(
    Effect.flatMap(([code, now]) =>
      Effect.fail(refusalWith(call, response, code, now))
    )
  );
