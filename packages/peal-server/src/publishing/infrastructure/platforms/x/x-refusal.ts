import { DateTime, Duration, Effect, Option, Schema } from "effect";
import { Headers, HttpClientResponse } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import {
  operatorRefusalCodes,
  platformRefusalCodes,
} from "#publishing/domain/own-refusals.ts";
import { optionRefusedCode } from "#publishing/infrastructure/platforms/option-refusal.ts";
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
 * the few errors that change what Peal does, never kept. A problem may name
 * the request's `parameter` or `field` at fault, or the `resource_type` it
 * is about, and an error the `parameters` it found wrong (X's OpenAPI
 * document, 2.174).
 */
export const XProblemSchema = Schema.Struct({
  detail: Schema.optionalKey(Schema.String),
  errors: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        code: Schema.optionalKey(Schema.Number),
        message: Schema.optionalKey(Schema.String),
        parameters: Schema.optionalKey(
          Schema.Record(Schema.String, Schema.Unknown)
        ),
      })
    )
  ),
  field: Schema.optionalKey(Schema.String),
  parameter: Schema.optionalKey(Schema.String),
  resource_type: Schema.optionalKey(Schema.String),
  title: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(Schema.String),
});

type XProblem = typeof XProblemSchema.Type;

// Which call was refused: an upload or a look at one (`media`), the post
// itself (`post`), which may have gone live when X fails, or a later part
// of a thread, posted as a reply to the part before (`reply`).
export type XCall = "media" | "post" | "reply";

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

// The fields of the post's body its options fill (`withOptions` in
// x-client.ts), and the resource one of them names.
const optionFields: ReadonlySet<string> = new Set([
  "community_id",
  "made_with_ai",
  "paid_partnership",
  "reply_settings",
  "share_with_followers",
]);

const optionResources: ReadonlySet<string> = new Set(["community"]);

/**
 * Whether X's answer points at one of the post's options: the parameter or
 * field it names, a parameter its errors list, the resource it is about
 * (a community), or its words naming the field. X documents no other
 * refusal of these fields.
 */
const blamesOptions = (problem: XProblem): boolean =>
  [problem.parameter, problem.field].some(
    (named) => named !== undefined && optionFields.has(named)
  ) ||
  (problem.errors ?? []).some(({ parameters }) =>
    Object.keys(parameters ?? {}).some((named) => optionFields.has(named))
  ) ||
  optionResources.has(problem.resource_type ?? "") ||
  [...optionFields].some((named) => says(problem, named));

const rejected = (call: XCall, code: string): PublishFailure =>
  call === "media" ? new MediaRejected({ code }) : new BadRequest({ code });

const refusal = (
  call: XCall,
  response: HttpClientResponse.HttpClientResponse,
  problem: XProblem,
  now: DateTime.Utc,
  optioned: boolean
): XRefusal => {
  const { status } = response;
  const kind = kindOf(problem);

  // The app reached the spending cap of its X account, or used up its
  // pay-per-use credits (402): X takes nothing from the server's app until
  // the operator pays. The post is not at fault: publishing keeps it
  // waiting, tells the operator, and fails it as appBillingLimit only if X
  // still refuses a day after its time.
  if (Option.contains(kind, "usage-capped")) {
    return new PlatformUnavailable({ code: operatorRefusalCodes.usageCapped });
  }

  if (status === 402) {
    return new PlatformUnavailable({
      code: operatorRefusalCodes.creditsDepleted,
    });
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
    return call === "media"
      ? new PlatformUnavailable()
      : new OutcomeUnknown({ reason: "noResponse" });
  }

  // A reply X does not let this app post: on self-serve access, X takes a
  // reply only from an account the post's author mentioned or quoted, and
  // its documentation gives no code for the refusal. A 403 naming a reply,
  // to a part of a thread: the thread cannot go on from this app.
  if (call === "reply" && status === 403 && says(problem, "reply")) {
    return new BadRequest({ code: platformRefusalCodes.repliesNotAllowed });
  }

  // The same text again: X refuses a post it already has from the account.
  if (says(problem, "duplicate")) {
    return new BadRequest({ code: "duplicate" });
  }

  // A video longer than this account may post (20 minutes by default).
  if (says(problem, "video longer than")) {
    return new MediaRejected({ code: "videoTooLong" });
  }

  // A post with options X would not take from this account or this app,
  // as X's answer says. Any other refusal keeps X's own problem.
  if (
    optioned &&
    call !== "media" &&
    (status === 400 || status === 403) &&
    blamesOptions(problem)
  ) {
    return new BadRequest({ code: optionRefusedCode });
  }

  return rejected(call, codeOf(kind, `http${status}`));
};

const refused = (
  call: XCall,
  response: HttpClientResponse.HttpClientResponse,
  optioned = false
) =>
  Effect.all([problemOf(response), DateTime.now]).pipe(
    Effect.map(([problem, now]) =>
      refusal(call, response, problem, now, optioned)
    )
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

/**
 * What X's refusal of the post itself means; `optioned` when its body
 * carried the post's options.
 */
export const postRefusal = (
  response: HttpClientResponse.HttpClientResponse,
  call: "post" | "reply" = "post",
  optioned = false
): Effect.Effect<never, XRefusal> =>
  refused(call, response, optioned).pipe(Effect.flatMap(Effect.fail));
