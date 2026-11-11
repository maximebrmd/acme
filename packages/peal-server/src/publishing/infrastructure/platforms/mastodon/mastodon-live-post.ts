import { DateTime, Duration, Effect, Option } from "effect";
import { HttpClientRequest } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import { invalidPlatformId } from "#publishing/infrastructure/platforms/live-post-remover.ts";
import type { LivePostRemover } from "#publishing/infrastructure/platforms/live-post-remover.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { isJsonRefusal } from "#shared/infrastructure/platforms/json-refusal.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

import { instanceOfAccount } from "./mastodon-client.ts";
import type { MastodonHttp } from "./mastodon-client.ts";

// Mastodon's status ids are numbers written as strings (snowflakes).
const statusIdPattern = /^\d{1,30}$/u;

// What Mastodon's answer to a deletion means, from its API reference
// (https://docs.joinmastodon.org/methods/statuses/#delete, read
// 2026-11-11): 200 with the status deleted; 404 "Status is not owned by
// you or does not exist", with Mastodon's JSON error, a status gone
// already, as the token can only name its own; 401 or 403 with that JSON,
// a token the instance will not take; 429 the rate limit ("30 times within
// 30 minutes" for deletions, https://docs.joinmastodon.org/api/rate-limits/),
// with its reset in X-RateLimit-Reset. Without Mastodon's JSON, a 401,
// 403 or 404 came from something on the way: the instance may answer
// later. Error messages are never kept.
const answered = Effect.fn("MastodonLivePost.answered")(function* answered(
  response: HttpClientResponse.HttpClientResponse
) {
  const { status } = response;

  if (status >= 200 && status < 300) {
    return "removed" as const;
  }

  if (status === 404 || status === 401 || status === 403) {
    if (!(yield* isJsonRefusal(response))) {
      return yield* new PlatformUnavailable();
    }

    return status === 404
      ? ("alreadyGone" as const)
      : yield* new TokenRejected();
  }

  if (status === 429) {
    const retryAfter = retryAfterOf(response.headers, yield* DateTime.now);

    return yield* Option.isSome(retryAfter) &&
    !Duration.isZero(retryAfter.value)
      ? new RateLimited({ retryAfter: retryAfter.value })
      : new RateLimited({});
  }

  if (status >= 500 || status === 408) {
    return yield* new PlatformUnavailable();
  }

  return yield* new BadRequest({
    code: status === 422 ? "unprocessable" : `http${status}`,
  });
});

/**
 * Deletes a status with DELETE /api/v1/statuses/:id on the account's own
 * instance, which needs `write:statuses`, the scope Peal asks for. The
 * status's media are left to the instance, which keeps them about a day
 * for a redraft and then deletes them.
 */
export const mastodonLivePost = (options: {
  readonly api: MastodonHttp;
  readonly scheme: "http:" | "https:";
}): LivePostRemover => {
  const { api, scheme } = options;

  return (token, platformPostId) =>
    Effect.gen(function* remove() {
      if (!statusIdPattern.test(platformPostId)) {
        return yield* new BadRequest({ code: invalidPlatformId });
      }

      const instance = yield* instanceOfAccount(token.accountId, scheme);

      return yield* api
        .execute(
          HttpClientRequest.delete(
            new URL(`/api/v1/statuses/${platformPostId}`, instance)
          ).pipe(HttpClientRequest.bearerToken(token.accessToken))
        )
        .pipe(
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
          }),
          Effect.flatMap(answered)
        );
    });
};
