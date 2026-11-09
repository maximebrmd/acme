import { Array as Arr, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import type {
  MetricsBatch,
  MetricsReadFailure,
  PostReading,
  PostToRead,
} from "#analytics/application/metrics-reader.ts";
import { CountSchema, PostMetrics } from "#analytics/domain/post-metrics.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#analytics/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";
import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";

export interface YouTubeMetricsOptions {
  readonly http: PlatformHttp;
  /** The YouTube Data API's origin: `https://www.googleapis.com`. */
  readonly api: URL;
}

// videos.list takes 50 ids at most, and no maxResults beside them.
const idsPerCall = 50;

// The API writes counts as strings; one hidden by the owner is left out.
const CountFromString = Schema.NumberFromString.pipe(
  Schema.decodeTo(CountSchema)
);

const VideoStatisticsSchema = Schema.Struct({
  id: Schema.String,
  statistics: Schema.optionalKey(
    Schema.Struct({
      commentCount: Schema.optionalKey(CountFromString),
      likeCount: Schema.optionalKey(CountFromString),
      viewCount: Schema.optionalKey(CountFromString),
    })
  ),
});

const VideosSchema = Schema.Struct({
  items: Schema.optionalKey(Schema.Array(VideoStatisticsSchema)),
});

const videosOf = HttpClientResponse.schemaBodyJson(VideosSchema);

// Google's refusal of the token: its own JSON error, never a proxy's page.
const GoogleErrorSchema = Schema.Struct({
  error: Schema.Struct({ code: Schema.optionalKey(Schema.Number) }),
});

const isGoogleError = HttpClientResponse.schemaBodyJson(GoogleErrorSchema);

const metricsOf = (video: typeof VideoStatisticsSchema.Type) =>
  new PostMetrics({
    impressions: Option.fromUndefinedOr(video.statistics?.viewCount),
    likes: video.statistics?.likeCount ?? 0,
    quotes: Option.none(),
    replies: video.statistics?.commentCount ?? 0,
    // YouTube has no reposts.
    reposts: 0,
  });

type Call =
  | { readonly _tag: "read"; readonly readings: readonly PostReading[] }
  | { readonly _tag: "failed"; readonly readings: readonly PostReading[] }
  | { readonly _tag: "halt" };

const halt: Call = { _tag: "halt" };

const failedOn = (posts: readonly PostToRead[]): Call => ({
  _tag: "failed",
  readings: posts.map(({ targetId }) => ({ _tag: "failed", targetId })),
});

/**
 * Reads videos on YouTube with videos.list, 50 ids to a call, with the
 * channel's token (`youtube.readonly`), so private and unlisted videos are
 * read too; each call costs a unit of the project's default quota. Views
 * count as impressions, comments as replies; YouTube has no reposts nor
 * quotes. A video the answer leaves out is missing: deleted, or no longer
 * the channel's. A 401 with Google's own error refuses the token; a quota
 * refusal or a 429 halts the read; a failure, or an answer Acme cannot
 * read, marks the call's posts failed and halts.
 */
export const youtubeMetrics = Effect.fn("YouTubeMetrics.make")(
  function* youtubeMetrics(options: YouTubeMetricsOptions) {
    const access = yield* ChannelAccess;
    const { api, http } = options;

    const readSome = Effect.fn("YouTubeMetrics.videos")(function* readSome(
      posts: readonly PostToRead[],
      token: Redacted.Redacted
    ) {
      const request = HttpClientRequest.get(
        new URL("/youtube/v3/videos", api)
      ).pipe(
        HttpClientRequest.setUrlParams({
          id: posts.map(({ platformPostId }) => platformPostId).join(","),
          part: "statistics",
        }),
        HttpClientRequest.bearerToken(token)
      );

      const sent = yield* http.execute(request).pipe(Effect.result);

      if (sent._tag === "Failure") {
        return failedOn(posts);
      }

      const response = sent.success;

      if (
        response.status === 401 &&
        Option.isSome(yield* isGoogleError(response).pipe(Effect.option))
      ) {
        return yield* new TokenRejected();
      }

      if (response.status === 403 || response.status === 429) {
        return halt;
      }

      if (response.status !== 200) {
        return failedOn(posts);
      }

      const found = yield* videosOf(response).pipe(Effect.option);

      return Option.match(found, {
        onNone: () => failedOn(posts),
        onSome: ({ items }): Call => {
          const byId = new Map((items ?? []).map((item) => [item.id, item]));

          return {
            _tag: "read",
            readings: posts.map(({ platformPostId, targetId }): PostReading => {
              const video = byId.get(platformPostId);

              return video === undefined
                ? { _tag: "missing", targetId }
                : { _tag: "counted", metrics: metricsOf(video), targetId };
            }),
          };
        },
      });
    });

    const readAll = Effect.fn("YouTubeMetrics.readAll")(function* readAll(
      posts: readonly PostToRead[],
      token: Redacted.Redacted
    ) {
      const readings: PostReading[] = [];

      for (const some of Arr.chunksOf(posts, idsPerCall)) {
        const call = yield* readSome(some, token);

        if (call._tag !== "halt") {
          readings.push(...call.readings);
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
