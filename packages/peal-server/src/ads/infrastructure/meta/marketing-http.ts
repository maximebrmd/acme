import { DateTime, Duration, Effect, Option, Schema } from "effect";
import { Headers, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError, UrlParams } from "effect/http";

import { AdNetworkRefused } from "#ads/application/ad-network-refused.ts";
import type { NetworkRefusalKind } from "#ads/application/ad-network-refused.ts";
import { OutcomeUnknown } from "#ads/application/outcome-unknown.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { graphUsageOf } from "#shared/infrastructure/platforms/graph-usage.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

/** The HTTP client the Marketing API adapter sends through: the public one. */
export type MarketingHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

// The Graph API's error body. Messages are never kept: they may quote what
// was sent.
const ErrorSchema = Schema.Struct({
  error: Schema.Struct({
    code: Schema.optionalKey(Schema.Number),
    error_subcode: Schema.optionalKey(Schema.Number),
    is_transient: Schema.optionalKey(Schema.Boolean),
  }),
});

const decodeError = Schema.decodeUnknownOption(ErrorSchema);

// The Marketing API's own usage header, beside the Graph API's two
// ("Rate Limiting" of the Marketing API): the share of the ad account's
// allowance used, and the seconds until it is given back.
const AccountUsageSchema = Schema.Struct({
  acc_id_util_pct: Schema.optionalKey(Schema.Number),
  reset_time_duration: Schema.optionalKey(Schema.Number),
});

const decodeAccountUsage = Schema.decodeUnknownOption(
  Schema.fromJsonString(AccountUsageSchema)
);

/** How much of the ad account's rate limits an answer says is used. */
export interface MarketingUsage {
  /** The highest percentage any header reports. */
  readonly percent: number;
  /** How long the network says to wait, when it says. */
  readonly wait: Option.Option<Duration.Duration>;
}

/** What an answer's usage headers say: nothing used when it has none. */
export const usageOf = (headers: Headers.Headers): MarketingUsage => {
  const graph = graphUsageOf(headers);

  const account = Headers.get(headers, "x-ad-account-usage").pipe(
    Option.flatMap(decodeAccountUsage)
  );

  const accountWait = account.pipe(
    Option.flatMapNullishOr(({ reset_time_duration: seconds }) => seconds),
    Option.filter((seconds) => seconds > 0),
    Option.map((seconds) => Duration.seconds(seconds))
  );

  return {
    percent: Math.max(
      Option.match(graph, {
        onNone: () => 0,
        onSome: ({ highestPercent }) => highestPercent,
      }),
      Option.match(account, {
        onNone: () => 0,
        onSome: ({ acc_id_util_pct: percent }) => percent ?? 0,
      })
    ),
    wait: graph.pipe(
      Option.flatMap(({ regainAccessIn }) => regainAccessIn),
      Option.orElse(() => accountWait)
    ),
  };
};

// From the Marketing API's "Rate Limiting" and "Error Reference" pages and
// the Graph API's "Handling Errors".

// 102 and 190: the session or the token is invalid, expired or revoked.
const isTokenCode = (code: number) => code === 102 || code === 190;

// 4 the app, 17 the user and the ad account, 613 a custom limit (too many
// calls, too many budget changes), 80000 to 80014 the ad account's business
// use cases, 368 a temporary block.
const isRateLimitCode = (code: number) =>
  code === 4 ||
  code === 17 ||
  code === 613 ||
  code === 368 ||
  (code >= 80_000 && code <= 80_014);

// Subcodes that say the same of an action: blocked for now.
const blockedSubcodes: ReadonlySet<number> = new Set([1_404_078, 2_859_015]);

// "Budget is too low", at creation and at update, and the ad set's own.
const budgetSubcodes: ReadonlySet<number> = new Set([
  1_885_272, 1_885_650, 1_487_901,
]);

// "You're no longer allowed to use Facebook Products to advertise".
const accountSubcodes: ReadonlySet<number> = new Set([1_404_163]);

// 10 and 200 to 299: a permission the token lacks, or an object its person
// cannot reach. 3: the app lacks the capability.
const isPermissionCode = (code: number) =>
  code === 3 || code === 10 || (code >= 200 && code <= 299);

const kindOf = (
  code: number,
  subcode: Option.Option<number>
): NetworkRefusalKind => {
  if (Option.exists(subcode, (value) => budgetSubcodes.has(value))) {
    return "budgetTooLow";
  }

  if (Option.exists(subcode, (value) => accountSubcodes.has(value))) {
    return "accountUnusable";
  }

  return isPermissionCode(code) ? "permission" : "other";
};

/** What a Marketing API answer that is not a success means. */
export type MarketingRefusal =
  | AdNetworkRefused
  | PlatformUnavailable
  | RateLimited
  | TokenRejected;

/**
 * Reads a refusal from an answer's status, error body and usage headers.
 * A body that cannot be read is judged by the status alone.
 */
export const refusalOf = Effect.fn("MetaAds.refusalOf")(function* refusalOf(
  response: HttpClientResponse.HttpClientResponse
) {
  const body: Option.Option<typeof ErrorSchema.Type> =
    yield* response.json.pipe(
      Effect.map((json) => decodeError(json)),
      Effect.orElseSucceed(() => Option.none<typeof ErrorSchema.Type>())
    );

  const code = body.pipe(Option.flatMapNullishOr(({ error }) => error.code));

  const subcode = body.pipe(
    Option.flatMapNullishOr(({ error }) => error.error_subcode)
  );

  const transient = Option.exists(
    body,
    ({ error }) => error.is_transient === true
  );

  const { status } = response;
  const now = yield* DateTime.now;

  const wait = usageOf(response.headers).wait.pipe(
    Option.orElse(() => retryAfterOf(response.headers, now)),
    Option.filter((duration) => !Duration.isZero(duration))
  );

  const limited = (): MarketingRefusal =>
    new RateLimited(
      Option.match(wait, {
        onNone: () => ({}),
        onSome: (retryAfter) => ({ retryAfter }),
      })
    );

  if (Option.isSome(code)) {
    if (isTokenCode(code.value)) {
      return new TokenRejected();
    }

    if (
      isRateLimitCode(code.value) ||
      Option.exists(subcode, (value) => blockedSubcodes.has(value))
    ) {
      return limited();
    }

    // 1 and 2 are Meta's own failures, "try again later".
    if (code.value === 1 || code.value === 2 || transient) {
      return new PlatformUnavailable();
    }

    return new AdNetworkRefused({
      code: Option.match(subcode, {
        onNone: () => `graph${code.value}`,
        onSome: (value) => `graph${code.value}.${value}`,
      }),
      kind: kindOf(code.value, subcode),
    });
  }

  if (status === 429) {
    return limited();
  }

  if (status >= 500) {
    return new PlatformUnavailable();
  }

  if (status === 401) {
    return new TokenRejected();
  }

  return new AdNetworkRefused({
    code: `http${status}`,
    kind: "other",
  });
});

/** An answer read with a schema, and the usage its headers report. */
export interface Answer<A> {
  readonly usage: MarketingUsage;
  readonly value: A;
}

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

/**
 * A read: a transport failure, a host the outbound guard refused or an
 * answer that cannot be decoded is the network unavailable, which reads
 * nothing; any answer that is not a success is the network's refusal.
 */
export const read = <A, I>(
  http: MarketingHttp,
  request: HttpClientRequest.HttpClientRequest,
  schema: Schema.Codec<A, I>
): Effect.Effect<Answer<A>, MarketingRefusal> =>
  http.execute(request).pipe(
    Effect.catch(() => Effect.fail(new PlatformUnavailable())),
    Effect.flatMap((response): Effect.Effect<Answer<A>, MarketingRefusal> =>
      isSuccess(response)
        ? HttpClientResponse.schemaBodyJson(schema)(response).pipe(
            Effect.map((value) => ({
              usage: usageOf(response.headers),
              value,
            })),
            Effect.mapError(() => new PlatformUnavailable())
          )
        : refusalOf(response).pipe(
            Effect.flatMap((refusal) => Effect.fail(refusal))
          )
    )
  );

// What an answer to a request that changes something means, when it is
// not a success: a failure of the network's own says nothing of what it
// did.
const writeRefused = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, MarketingRefusal | OutcomeUnknown> =>
  response.status >= 500
    ? Effect.fail(new OutcomeUnknown())
    : refusalOf(response).pipe(
        Effect.flatMap(
          (refusal): Effect.Effect<never, MarketingRefusal | OutcomeUnknown> =>
            refusal._tag === "PlatformUnavailable"
              ? Effect.fail(new OutcomeUnknown())
              : Effect.fail(refusal)
        )
      );

/**
 * A request that changes something. The network's refusal is its answer
 * that nothing changed. Anything else that is not a readable success (no
 * answer, a connection cut, a 5xx, a success that cannot be decoded) is
 * `OutcomeUnknown`: the request left, and may have been taken.
 */
export const write = <A, I>(
  http: MarketingHttp,
  request: HttpClientRequest.HttpClientRequest,
  schema: Schema.Codec<A, I>
): Effect.Effect<A, MarketingRefusal | OutcomeUnknown> =>
  http.execute(request).pipe(
    Effect.catchTags({
      HttpClientError: () => Effect.fail(new OutcomeUnknown()),
      // A request the guard refused never left.
      OutboundRequestRefused: () => Effect.fail(new PlatformUnavailable()),
    }),
    Effect.flatMap(
      (response): Effect.Effect<A, MarketingRefusal | OutcomeUnknown> =>
        isSuccess(response)
          ? HttpClientResponse.schemaBodyJson(schema)(response).pipe(
              Effect.mapError(() => new OutcomeUnknown())
            )
          : writeRefused(response)
    )
  );

/** A GET with query parameters; Redacted ones stay out of traces. */
export const getWith = (url: URL, params: UrlParams.Input) =>
  HttpClientRequest.get(url).pipe(HttpClientRequest.setUrlParams(params));

/** A POST with a form body, which keeps the token out of the address. */
export const postForm = (url: URL, params: UrlParams.Input) =>
  HttpClientRequest.post(url).pipe(HttpClientRequest.bodyUrlParams(params));
