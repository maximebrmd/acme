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
 * A Business Profile API error: `status` names it as Google's APIs do
 * (`INVALID_ARGUMENT`, `PERMISSION_DENIED`…), and `details` add why: an
 * `ErrorInfo`'s `reason` (`SERVICE_DISABLED`), or a `ValidationError`'s
 * `errorDetails`, each with the numeric `ErrorCode` and the path of the
 * request field it is about. Messages and the `value` that failed may quote
 * what was sent, so they are never read.
 */
const BusinessErrorSchema = Schema.Struct({
  error: Schema.Struct({
    details: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          errorDetails: Schema.optionalKey(
            Schema.Array(
              Schema.Struct({
                code: Schema.optionalKey(Schema.Number),
                field: Schema.optionalKey(Schema.String),
              })
            )
          ),
          reason: Schema.optionalKey(Schema.String),
        })
      )
    ),
    status: Schema.optionalKey(Schema.String),
  }),
});

type BusinessError = typeof BusinessErrorSchema.Type;

const errorOf = (response: HttpClientResponse.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(BusinessErrorSchema)(response).pipe(
    Effect.orElseSucceed((): BusinessError => ({ error: {} }))
  );

/**
 * The codes this adapter gives Google's refusals that have a cause of their
 * own. They are kept in the publication journal, so never change one.
 */
export const googleBusinessRefusalCodes = {
  // Google takes no local post for the location: it lost its verification
  // or was suspended or disabled since it was connected (the ErrorCode's
  // operation range, as LOCATION_DISABLED_FOR_LOCAL_POST_API).
  locationCannotPost: "locationCannotPost",
  // The location is no longer where the channel knows it: deleted, or
  // moved to another account.
  locationNotFound: "locationNotFound",
  // The Google user who connected the channel may no longer manage the
  // location.
  permissionDenied: "permissionDenied",
  // Google rejected the post it had taken, for its content policy.
  postRejected: "postRejected",
} as const;

// The numeric ranges of the Business Profile APIs' ErrorCode: photos, and
// operations refused for what the account or the location is.
const photoCodes = { from: 1000, to: 1099 } as const;

const operationCodes = { from: 1300, to: 1399 } as const;

const within =
  (range: { readonly from: number; readonly to: number }) => (code: number) =>
    code >= range.from && code <= range.to;

// ErrorInfo reasons that name the server's Google Cloud project, not the
// account: the operator's to fix.
const projectReasons: ReadonlySet<string> = new Set([
  "API_KEY_SERVICE_BLOCKED",
  "BILLING_DISABLED",
  "CONSUMER_INVALID",
  "CONSUMER_SUSPENDED",
  "SERVICE_DISABLED",
]);

// The reason of a quota spent, whatever status carries it.
const rateReason = "RATE_LIMIT_EXCEEDED";

// The reason that refuses the token itself, which a reconnection replaces.
const scopeReason = "ACCESS_TOKEN_SCOPE_INSUFFICIENT";

export type GoogleBusinessRefusal = PublishFailure | TokenRejected;

// The refusal's code, for support: Google's status, with the request field
// its first validation error names (`INVALID_ARGUMENT:summary`).
const describedCode = (
  status: Option.Option<string>,
  field: Option.Option<string>,
  fallback: string
) =>
  codeOf(
    Option.all([status, field]).pipe(
      Option.map(([name, path]) => `${name}:${path}`)
    ),
    codeOf(status, fallback)
  );

/**
 * What Google's refusal means, from its HTTP status, its `status` and its
 * details, per the Business Profile APIs' limits and ErrorCode pages:
 *
 * - 5xx: Google down, for now.
 * - 429, `RESOURCE_EXHAUSTED`, or the reason `RATE_LIMIT_EXCEEDED`: the
 *   project's requests a minute are spent
 *   (300 once Google gave access, 0 before), for as long as the answer
 *   says, a minute otherwise.
 * - 401, `UNAUTHENTICATED`, or a scope the token lacks: the token, which a
 *   renewal or a reconnection replaces.
 * - 403 naming the project (the API not enabled): the operator's to fix,
 *   retried as Google being unavailable.
 * - Any other 403: the Google user may no longer manage the location.
 * - 404: the location is gone, or moved to another account.
 * - A validation error in the photos' range (`PHOTO_FETCH_FAILED`…): the
 *   photo; in the operations' range: the location cannot post.
 * - Anything else: the post refused as sent, kept as Google's status and
 *   the field it names.
 */
export const refusalOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<GoogleBusinessRefusal> =>
  Effect.gen(function* refusing() {
    const { status } = response;

    if (status >= 500) {
      return new PlatformUnavailable();
    }

    const { error } = yield* errorOf(response);
    const named = Option.fromUndefinedOr(error.status);
    const details = error.details ?? [];
    const reasons = details.flatMap(({ reason }) => reason ?? []);
    const invalid = details.flatMap(({ errorDetails }) => errorDetails ?? []);
    const codes = invalid.flatMap(({ code }) => code ?? []);
    const now = yield* DateTime.now;

    if (
      status === 429 ||
      Option.contains(named, "RESOURCE_EXHAUSTED") ||
      reasons.includes(rateReason)
    ) {
      return Option.match(retryAfterOf(response.headers, now), {
        onNone: () => new RateLimited({}),
        onSome: (retryAfter) => new RateLimited({ retryAfter }),
      });
    }

    if (
      status === 401 ||
      Option.contains(named, "UNAUTHENTICATED") ||
      reasons.includes(scopeReason)
    ) {
      return new TokenRejected();
    }

    if (reasons.some((reason) => projectReasons.has(reason))) {
      yield* Effect.logError(
        "Google refuses this server's project: enable the Business Profile APIs for the project of GOOGLE_BUSINESS_CLIENT_ID"
      );

      return new PlatformUnavailable();
    }

    if (codes.some(within(operationCodes))) {
      return new BadRequest({
        code: googleBusinessRefusalCodes.locationCannotPost,
      });
    }

    if (codes.some(within(photoCodes))) {
      return new MediaRejected({
        code: `photoError${String(codes.find(within(photoCodes)))}`,
      });
    }

    if (status === 403) {
      return new BadRequest({
        code: googleBusinessRefusalCodes.permissionDenied,
      });
    }

    if (status === 404) {
      return new BadRequest({
        code: googleBusinessRefusalCodes.locationNotFound,
      });
    }

    return new BadRequest({
      code: describedCode(
        named,
        Option.fromUndefinedOr(
          invalid.find(({ field }) => field !== undefined)
        ).pipe(Option.flatMap(({ field }) => Option.fromUndefinedOr(field))),
        `http${status}`
      ),
    });
  });

/** A read, or anything that makes nothing live, refused. */
export const readRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, GoogleBusinessRefusal> =>
  refusalOf(response).pipe(Effect.flatMap((refusal) => Effect.fail(refusal)));

/**
 * The create call refused. A server error says nothing of the post, which
 * Google may have made before failing: its outcome is unknown.
 */
export const createRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, GoogleBusinessRefusal | OutcomeUnknown> =>
  response.status >= 500
    ? Effect.fail(new OutcomeUnknown({ reason: "noResponse" }))
    : readRefusal(response);
