import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import type {
  MetricsBatch,
  MetricsReadFailure,
  PostReading,
  PostToRead,
} from "#analytics/application/metrics-reader.ts";
import { maxCount, PostMetrics } from "#analytics/domain/post-metrics.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#analytics/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";
import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { pinterestErrorCodeOf } from "#shared/infrastructure/platforms/pinterest-api.ts";

export interface PinterestMetricsOptions {
  readonly http: PlatformHttp;
  /** The API's origin: `https://api.pinterest.com`, or its Sandbox's. */
  readonly api: URL;
}

// pins/analytics reads at most 90 days back from today, start included.
const window = Duration.days(89);

// What Peal asks of a Pin: how often it was shown and saved over the
// window, and its comments and reactions, which Pinterest gives over the
// Pin's whole life only.
const metricTypes = "IMPRESSION,SAVE,TOTAL_COMMENTS,TOTAL_REACTIONS";

const CountsSchema = Schema.Record(Schema.String, Schema.Number);

// The metrics of one split: without a split, Pinterest answers one.
const MetricsSchema = Schema.Struct({
  lifetime_metrics: Schema.optionalKey(Schema.NullOr(CountsSchema)),
  summary_metrics: Schema.optionalKey(Schema.NullOr(CountsSchema)),
});

// pins/analytics's answer: the metrics, under the name of their split.
const AnalyticsSchema = Schema.Record(Schema.String, MetricsSchema);

const analyticsOf = HttpClientResponse.schemaBodyJson(AnalyticsSchema);

// A count Pinterest gave, as Peal keeps counts: whole, never negative, and
// no more than its column holds. None when Pinterest gave none.
const countOf = (
  counts: Readonly<Record<string, number>> | null | undefined,
  name: string
): Option.Option<number> =>
  Option.fromNullishOr(counts?.[name]).pipe(
    Option.filter((count) => Number.isFinite(count) && count >= 0),
    Option.map((count) => Math.min(Math.round(count), maxCount))
  );

const metricsOf = (metrics: typeof MetricsSchema.Type) => {
  const lifetime = (name: string) =>
    countOf(metrics.lifetime_metrics, name).pipe(
      Option.orElse(() => countOf(metrics.summary_metrics, name)),
      Option.getOrElse(() => 0)
    );

  return new PostMetrics({
    impressions: countOf(metrics.summary_metrics, "IMPRESSION"),
    likes: lifetime("TOTAL_REACTIONS"),
    // Pinterest has no quotes.
    quotes: Option.none(),
    replies: lifetime("TOTAL_COMMENTS"),
    // A save puts the Pin on someone's board, as a repost does elsewhere.
    reposts: Option.getOrElse(
      countOf(metrics.summary_metrics, "SAVE"),
      () => 0
    ),
  });
};

// A calendar day in UTC, as Pinterest's dates: YYYY-MM-DD.
const dayOf = (instant: DateTime.Utc) =>
  DateTime.formatIso(instant).slice(0, 10);

type Call =
  | { readonly _tag: "read"; readonly reading: PostReading }
  | { readonly _tag: "failed"; readonly reading: PostReading }
  | { readonly _tag: "halt" };

const halt: Call = { _tag: "halt" };

const failedOn = ({ targetId }: PostToRead): Call => ({
  _tag: "failed",
  reading: { _tag: "failed", targetId },
});

/**
 * Reads Pins on Pinterest with pins/analytics, one Pin to a call, with the
 * channel's token (`pins:read` and `boards:read`), over the 90 days up to
 * today, which hold all a Pin's life while Peal follows it. Impressions are
 * impressions, saves count as reposts, reactions as likes and comments as
 * replies; Pinterest has no quotes, and Peal keeps neither its Pin clicks
 * nor its outbound clicks. Pinterest allows an app with Standard access 60
 * such calls a minute for each account, and one with Trial access 1,000 a
 * day in all: a 429 halts the read.
 *
 * A Pin Pinterest answers 404 for is missing: deleted, or no longer the
 * account's. A 401 with Pinterest's own error refuses the token; any other
 * failure, or an answer Peal cannot read (a 403 for an account whose
 * analytics the app may not read included), marks the Pin failed and halts.
 */
export const pinterestMetrics = Effect.fn("PinterestMetrics.make")(
  function* pinterestMetrics(options: PinterestMetricsOptions) {
    const access = yield* ChannelAccess;
    const { api, http } = options;

    const readOne = Effect.fn("PinterestMetrics.pin")(function* readOne(
      post: PostToRead,
      token: Redacted.Redacted,
      today: DateTime.Utc
    ) {
      const request = HttpClientRequest.get(
        new URL(
          `/v5/pins/${encodeURIComponent(post.platformPostId)}/analytics`,
          api
        )
      ).pipe(
        HttpClientRequest.setUrlParams({
          end_date: dayOf(today),
          metric_types: metricTypes,
          start_date: dayOf(DateTime.subtractDuration(today, window)),
        }),
        HttpClientRequest.bearerToken(token)
      );

      const sent = yield* http.execute(request).pipe(Effect.result);

      if (sent._tag === "Failure") {
        return failedOn(post);
      }

      const response = sent.success;

      if (
        response.status === 401 &&
        Option.isSome(yield* pinterestErrorCodeOf(response))
      ) {
        return yield* new TokenRejected();
      }

      if (response.status === 429) {
        return halt;
      }

      if (response.status === 404) {
        const missing: Call = {
          _tag: "read",
          reading: { _tag: "missing", targetId: post.targetId },
        };

        return missing;
      }

      if (response.status !== 200) {
        return failedOn(post);
      }

      const found = yield* analyticsOf(response).pipe(Effect.option);

      const metrics = found.pipe(
        Option.flatMap((splits) =>
          Option.fromUndefinedOr(splits["all"] ?? Object.values(splits)[0])
        )
      );

      if (Option.isNone(metrics)) {
        return failedOn(post);
      }

      const counted: Call = {
        _tag: "read",
        reading: {
          _tag: "counted",
          metrics: metricsOf(metrics.value),
          targetId: post.targetId,
        },
      };

      return counted;
    });

    const readAll = Effect.fn("PinterestMetrics.readAll")(function* readAll(
      posts: readonly PostToRead[],
      token: Redacted.Redacted
    ) {
      const today = yield* DateTime.now;
      const readings: PostReading[] = [];

      for (const post of posts) {
        const call = yield* readOne(post, token, today);

        if (call._tag !== "halt") {
          readings.push(call.reading);
        }

        if (call._tag !== "read") {
          const halted: MetricsBatch = { halted: true, readings };

          return halted;
        }
      }

      const batch: MetricsBatch = { halted: false, readings };

      return batch;
    });

    const read = (
      account: ChannelAccount,
      posts: readonly PostToRead[]
    ): Effect.Effect<MetricsBatch, MetricsReadFailure> =>
      access
        .withToken(account.channelId, ({ accessToken }) =>
          readAll(posts, accessToken)
        )
        .pipe(
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );

    return { read };
  }
);
