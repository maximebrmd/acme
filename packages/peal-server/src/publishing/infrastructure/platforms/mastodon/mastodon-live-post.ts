import type { Redacted } from "effect";
import { DateTime, Duration, Effect, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { postGone } from "#publishing/infrastructure/platforms/live-post-editor.ts";
import type { LivePostEditor } from "#publishing/infrastructure/platforms/live-post-editor.ts";
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

// A status id is a string, "cast from an integer but not guaranteed to be
// a number" (https://docs.joinmastodon.org/entities/Status/, read
// 2026-11-11): Mastodon's are digits, other servers of the same API give
// other shapes. One of URL-safe characters is taken, and sent encoded, as
// analytics and the inbox send it; a dot, a slash or anything else that
// could change the path is not.
const statusIdPattern = /^[A-Za-z0-9_-]{1,64}$/u;

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
            new URL(
              `/api/v1/statuses/${encodeURIComponent(platformPostId)}`,
              instance
            )
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

// What an edit reads of the status before it is sent again
// (https://docs.joinmastodon.org/entities/Status/, read 2026-11-12): its
// attachments' ids, in order, its warning, whether it is sensitive, and
// its poll (null without one).
const EditedStatusSchema = Schema.Struct({
  media_attachments: Schema.Array(Schema.Struct({ id: Schema.String })),
  poll: Schema.NullOr(Schema.Unknown),
  sensitive: Schema.Boolean,
  spoiler_text: Schema.String,
});

/** The code of a status with a poll, which an edit would destroy. */
export const pollNotEditable = "pollNotEditable";

/** The code of a call the account's token is not allowed to make. */
export const permissionDenied = "permissionDenied";

// What an edit's answers mean, from the API reference
// (https://docs.joinmastodon.org/methods/statuses/#edit and #get, read
// 2026-11-12): 200 the status; 404 "Status does not exist, is private, or
// is not owned by you", with Mastodon's JSON error, a status gone, which
// an edit cannot bring back; 401 with that JSON a token the instance does
// not know; 403 with it a token without the scope (`read:statuses`, which
// apps registered before Peal asked for it lack: reconnecting the channel
// asks again) or a status the account may not edit; 429 the limit edits
// share with posting. Without Mastodon's JSON, a 401, 403 or 404 came
// from something on the way. A server error leaves the status as it was
// or edited, which the same text again settles. Error messages are never
// kept.
const editRefusal = Effect.fn("MastodonLiveEdit.refusal")(function* editRefusal(
  response: HttpClientResponse.HttpClientResponse
) {
  const { status } = response;

  if (status === 404 || status === 401 || status === 403) {
    if (!(yield* isJsonRefusal(response))) {
      return yield* new PlatformUnavailable();
    }

    if (status === 401) {
      return yield* new TokenRejected();
    }

    return yield* new BadRequest({
      code: status === 404 ? postGone : permissionDenied,
    });
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
 * Replaces a status's text with PUT /api/v1/statuses/:id
 * (`write:statuses`, since Mastodon 3.5.0). Mastodon's statuses
 * controller hands every field to UpdateStatusService, so a field left
 * out is cleared: no `media_ids` detaches the attachments, no
 * `spoiler_text` clears the warning, no `sensitive` unmarks the status,
 * and a poll left out is destroyed (read in Mastodon's source,
 * `app/controllers/api/v1/statuses_controller.rb` and
 * `app/services/update_status_service.rb`, 2026-11-12). So the status is
 * read first (GET, `read:statuses`), and sent again with its attachments
 * in order, its warning and its sensitivity as Mastodon has them now, not
 * as Peal stored them at publishing: an edit changes the text alone, and
 * its author may have changed the rest on Mastodon since. No language is
 * sent, which Mastodon keeps. A 404 is taken as the status gone only once
 * the token is known to work (`verify_credentials`): Mastodon answers 404
 * to a followers-only status for a token it does not recognise. A status
 * with a poll is refused
 * before any change (`pollNotEditable`): Peal sends no poll, and the edit
 * would destroy it. Visibility is not a parameter of an edit.
 */
export const mastodonLiveEdit = (options: {
  readonly api: MastodonHttp;
  readonly scheme: "http:" | "https:";
}): LivePostEditor => {
  const { api, scheme } = options;

  const call = (request: HttpClientRequest.HttpClientRequest) =>
    api.execute(request).pipe(
      Effect.catchTags({
        HttpClientError: unanswered,
        OutboundRequestRefused: unanswered,
      })
    );

  // After a 404 of a status: gone when the token works, its renewal when
  // Mastodon no longer recognises it, unknown otherwise.
  const tokenStillWorks = (instance: URL, accessToken: Redacted.Redacted) =>
    call(
      HttpClientRequest.get(
        new URL("/api/v1/accounts/verify_credentials", instance)
      ).pipe(HttpClientRequest.bearerToken(accessToken))
    ).pipe(
      Effect.flatMap(
        (
          answer
        ): Effect.Effect<
          never,
          BadRequest | PlatformUnavailable | TokenRejected
        > => {
          if (answer.status === 200) {
            return Effect.fail(new BadRequest({ code: postGone }));
          }

          return answer.status === 401
            ? Effect.fail(new TokenRejected())
            : Effect.fail(new PlatformUnavailable());
        }
      )
    );

  return (token, { platformPostId, text }) =>
    Effect.gen(function* edit() {
      if (!statusIdPattern.test(platformPostId)) {
        return yield* new BadRequest({ code: invalidPlatformId });
      }

      const instance = yield* instanceOfAccount(token.accountId, scheme);

      const statusUrl = new URL(
        `/api/v1/statuses/${encodeURIComponent(platformPostId)}`,
        instance
      );

      const read = yield* call(
        HttpClientRequest.get(statusUrl).pipe(
          HttpClientRequest.bearerToken(token.accessToken)
        )
      );

      if (read.status === 404 && (yield* isJsonRefusal(read))) {
        return yield* tokenStillWorks(instance, token.accessToken);
      }

      if (read.status !== 200) {
        return yield* editRefusal(read);
      }

      const status = yield* HttpClientResponse.schemaBodyJson(
        EditedStatusSchema
      )(read).pipe(Effect.mapError(() => new PlatformUnavailable()));

      if (status.poll !== null) {
        return yield* new BadRequest({ code: pollNotEditable });
      }

      const written = yield* call(
        HttpClientRequest.put(statusUrl).pipe(
          HttpClientRequest.bearerToken(token.accessToken),
          HttpClientRequest.bodyJsonUnsafe({
            media_ids: status.media_attachments.map(({ id }) => id),
            sensitive: status.sensitive,
            spoiler_text: status.spoiler_text,
            status: text,
          })
        )
      );

      if (written.status !== 200) {
        return yield* editRefusal(written);
      }

      return "edited" as const;
    });
};
