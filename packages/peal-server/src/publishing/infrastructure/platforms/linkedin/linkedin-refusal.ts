import { DateTime, Effect, Option, Schema } from "effect";
import { HttpClientResponse } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import { codeOf } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

/**
 * LinkedIn's error body: `code` names the error on the versioned API, and
 * `message` describes it, which may quote the post, so it is only searched
 * for the few errors that change what Peal does, never kept.
 */
export const LinkedInErrorSchema = Schema.Struct({
  code: Schema.optionalKey(Schema.String),
  // A request LinkedIn could not validate names each field's error here.
  errorDetails: Schema.optionalKey(
    Schema.Struct({
      inputErrors: Schema.optionalKey(
        Schema.Array(Schema.Struct({ code: Schema.optionalKey(Schema.String) }))
      ),
    })
  ),
  message: Schema.optionalKey(Schema.String),
  serviceErrorCode: Schema.optionalKey(Schema.Number),
});

type LinkedInError = typeof LinkedInErrorSchema.Type;

// Which call was refused: an upload or a look at one (`media`), or the post
// itself (`post`), which may have gone live when LinkedIn fails.
export type LinkedInCall = "media" | "post";

export type LinkedInRefusal = OutcomeUnknown | PublishFailure | TokenRejected;

const errorOf = (response: HttpClientResponse.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(LinkedInErrorSchema)(response).pipe(
    Effect.orElseSucceed((): LinkedInError => ({}))
  );

const mentions = (error: LinkedInError, words: readonly string[]) => {
  const texts = [
    error.code,
    error.message,
    ...(error.errorDetails?.inputErrors ?? []).map(({ code }) => code),
  ].map((text) => (text ?? "").toUpperCase());

  return words.some((word) => texts.some((text) => text.includes(word)));
};

// LinkedIn's rate limits are daily, per member and per app, and reset at
// midnight UTC; it sends no header saying when. Retry-After is read if it
// ever comes.
const rateLimited = (
  response: HttpClientResponse.HttpClientResponse,
  now: DateTime.Utc
) =>
  new RateLimited({
    retryAfter: retryAfterOf(response.headers, now).pipe(
      Option.getOrElse(() =>
        DateTime.distance(
          now,
          now.pipe(DateTime.add({ days: 1 }), DateTime.startOf("day"))
        )
      )
    ),
  });

const rejected = (call: LinkedInCall, code: string): PublishFailure =>
  call === "media" ? new MediaRejected({ code }) : new BadRequest({ code });

const refusal = (
  call: LinkedInCall,
  response: HttpClientResponse.HttpClientResponse,
  error: LinkedInError,
  now: DateTime.Utc
): LinkedInRefusal => {
  const { status } = response;

  // An expired or revoked token (401), or one without the permission the
  // call needs (403): either is refused before anything happens, and only
  // reconnecting fixes it, as LinkedIn renews no token.
  if (status === 401 || status === 403) {
    return new TokenRejected();
  }

  if (status === 429) {
    return rateLimited(response, now);
  }

  if (status >= 500) {
    return call === "post"
      ? new OutcomeUnknown({ reason: "noResponse" })
      : new PlatformUnavailable();
  }

  // A post whose image or video LinkedIn could not process.
  if (call === "post" && mentions(error, ["PROCESSING_FAILED"])) {
    return new MediaRejected({ code: "processingFailed" });
  }

  // A conflict asks to try again, as does a post sent before its video was
  // ready (MEDIA_ASSET_WAITING_UPLOAD): LinkedIn made nothing.
  if (
    status === 409 ||
    (call === "post" && mentions(error, ["WAITING_UPLOAD"]))
  ) {
    return new PlatformUnavailable();
  }

  // The API version Peal sends was retired: LINKEDIN_API_VERSION must move.
  if (status === 426) {
    return rejected(call, "apiVersionRetired");
  }

  if (call === "post" && mentions(error, ["DUPLICATE"])) {
    return rejected(call, "duplicate");
  }

  return rejected(
    call,
    codeOf(
      Option.fromUndefinedOr(error.code).pipe(
        Option.orElse(() =>
          Option.fromUndefinedOr(error.errorDetails?.inputErrors?.[0]?.code)
        )
      ),
      `http${status}`
    )
  );
};

const refused = (
  call: LinkedInCall,
  response: HttpClientResponse.HttpClientResponse
) =>
  Effect.all([errorOf(response), DateTime.now]).pipe(
    Effect.map(([error, now]) => refusal(call, response, error, now))
  );

/**
 * What LinkedIn's refusal of an upload, or of a look at one, means, from its
 * error handling guide and the Images and Videos references.
 */
export const mediaRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, PublishFailure | TokenRejected> =>
  refused("media", response).pipe(
    Effect.flatMap((found) =>
      Effect.fail(
        found._tag === "OutcomeUnknown" ? new PlatformUnavailable() : found
      )
    )
  );

/** What LinkedIn's refusal of the post itself means (Posts API). */
export const postRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, LinkedInRefusal> =>
  refused("post", response).pipe(Effect.flatMap(Effect.fail));
