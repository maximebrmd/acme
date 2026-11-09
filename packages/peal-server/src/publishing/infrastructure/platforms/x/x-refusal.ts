import { DateTime, Duration, Effect, Option, Schema } from "effect";
import { Headers, HttpClientResponse } from "effect/http";

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
 * X's error body: a problem (`type`, `title`, `detail`), or the older list of
 * `errors`. `type` names the problem under `https://api.x.com/2/problems/`;
 * `detail` and messages may quote the post, so they are only searched for
 * the few errors that change what Acme does, never kept.
 */
export const XProblemSchema = Schema.Struct({
  detail: Schema.optionalKey(Schema.String),
  errors: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        code: Schema.optionalKey(Schema.Number),
        message: Schema.optionalKey(Schema.String),
      })
    )
  ),
  title: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(Schema.String),
});

type XProblem = typeof XProblemSchema.Type;

// Which call was refused: an upload or a look at one (`media`), or the post
// itself (`post`), which may have gone live when X fails.
export type XCall = "media" | "post";

export type XRefusal = OutcomeUnknown | PublishFailure | TokenRejected;

const problemOf = (response: HttpClientResponse.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(XProblemSchema)(response).pipe(
    Effect.orElseSucceed((): XProblem => ({}))
  );

// The last part of the problem's type, such as `usage-capped`.
const kindOf = (problem: XProblem): Option.Option<string> =>
  Option.fromUndefinedOr(problem.type).pipe(
    Option.flatMap((type) => Option.fromUndefinedOr(type.split("/").at(-1))),
    Option.filter((kind) => kind !== "" && kind !== "about:blank")
  );

const says = (problem: XProblem, words: string) =>
  [
    problem.detail,
    problem.title,
    ...(problem.errors ?? []).map(({ message }) => message),
  ].some((text) => (text ?? "").toLowerCase().includes(words));

// X's rate limit headers, by window: the 15-minute window of the endpoint
// (`x-rate-limit-*`), and the 24-hour caps on posting per user and per app.
// Each says how many requests are left and when the window resets, in epoch
// seconds.
const windows = [
  "x-user-limit-24hour",
  "x-app-limit-24hour",
  "x-rate-limit",
] as const;

const secondsPattern = /^\d+$/u;

const resetOf = (
  headers: Headers.Headers,
  window: string,
  now: DateTime.Utc
): Option.Option<Duration.Duration> =>
  Headers.get(headers, `${window}-reset`).pipe(
    Option.map((value) => value.trim()),
    Option.filter((value) => secondsPattern.test(value)),
    Option.map((value) =>
      Duration.max(
        DateTime.distance(now, DateTime.makeUnsafe(Number(value) * 1000)),
        Duration.zero
      )
    )
  );

/**
 * How long X asked to wait: until the latest reset among the windows it
 * says are spent, then the endpoint's own reset, then Retry-After.
 */
export const xRetryAfter = (
  headers: Headers.Headers,
  now: DateTime.Utc
): Option.Option<Duration.Duration> => {
  const spent = windows.flatMap((window) =>
    Headers.get(headers, `${window}-remaining`).pipe(
      Option.filter((remaining) => remaining.trim() === "0"),
      Option.flatMap(() => resetOf(headers, window, now)),
      Option.toArray
    )
  );

  let latest = Option.none<Duration.Duration>();

  for (const wait of spent) {
    latest = Option.some(
      Option.match(latest, {
        onNone: () => wait,
        onSome: (other) => Duration.max(other, wait),
      })
    );
  }

  return latest.pipe(
    Option.orElse(() => resetOf(headers, "x-rate-limit", now)),
    Option.orElse(() => retryAfterOf(headers, now))
  );
};

const rejected = (call: XCall, code: string): PublishFailure =>
  call === "media" ? new MediaRejected({ code }) : new BadRequest({ code });

const refusal = (
  call: XCall,
  response: HttpClientResponse.HttpClientResponse,
  problem: XProblem,
  now: DateTime.Utc
): XRefusal => {
  const { status } = response;
  const kind = kindOf(problem);

  // The app's spending cap is reached: nothing goes out until the operator
  // raises it, so waiting does not help.
  if (Option.contains(kind, "usage-capped")) {
    return new BadRequest({ code: "usageCapped" });
  }

  // The token expired or was revoked, before anything happened: the
  // channels context renews it, and asks for a reconnect if that fails.
  if (status === 401) {
    return new TokenRejected();
  }

  if (status === 429) {
    const wait = xRetryAfter(response.headers, now);

    return Option.isSome(wait) && !Duration.isZero(wait.value)
      ? new RateLimited({ retryAfter: wait.value })
      : new RateLimited({});
  }

  if (status >= 500) {
    return call === "post"
      ? new OutcomeUnknown({ reason: "noResponse" })
      : new PlatformUnavailable();
  }

  // The same text again: X refuses a post it already has from the account.
  if (says(problem, "duplicate")) {
    return new BadRequest({ code: "duplicate" });
  }

  // A video longer than this account may post (20 minutes by default).
  if (says(problem, "video longer than")) {
    return new MediaRejected({ code: "videoTooLong" });
  }

  return rejected(call, codeOf(kind, `http${status}`));
};

const refused = (
  call: XCall,
  response: HttpClientResponse.HttpClientResponse
) =>
  Effect.all([problemOf(response), DateTime.now]).pipe(
    Effect.map(([problem, now]) => refusal(call, response, problem, now))
  );

/**
 * What X's refusal of an upload, or of a look at one, means, from X's
 * response codes and errors reference.
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

/** What X's refusal of the post itself means. */
export const postRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, XRefusal> =>
  refused("post", response).pipe(Effect.flatMap(Effect.fail));
