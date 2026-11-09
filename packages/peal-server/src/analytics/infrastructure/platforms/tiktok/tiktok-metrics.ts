import { Array as Arr, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
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
import {
  scopeRefusalCodes,
  tiktokAnswer,
  tiktokErrorCodeOf,
  tokenRefusalCodes,
} from "#shared/infrastructure/platforms/tiktok-api.ts";

export interface TikTokMetricsOptions {
  /** TikTok's API: `https://open.tiktokapis.com`, or a fake's in tests. */
  readonly api: URL;
  readonly http: PlatformHttp;
}

/** The scope that lets Acme read the creator's videos. */
export const videoListScope = "video.list";

// /v2/video/query/ takes 20 video ids at most.
const idsPerCall = 20;

// A public post's id, as TikTok gives it: digits. A post only its creator
// sees is known by its publish_id instead, which nothing reads back.
const videoId = /^\d+$/u;

const VideoSchema = Schema.Struct({
  comment_count: Schema.optionalKey(CountSchema),
  id: Schema.String,
  like_count: Schema.optionalKey(CountSchema),
  share_count: Schema.optionalKey(CountSchema),
  view_count: Schema.optionalKey(CountSchema),
});

const VideosSchema = tiktokAnswer(
  Schema.Struct({ videos: Schema.optionalKey(Schema.Array(VideoSchema)) })
);

const metricsOf = (video: typeof VideoSchema.Type) =>
  new PostMetrics({
    impressions: Option.fromUndefinedOr(video.view_count),
    likes: video.like_count ?? 0,
    quotes: Option.none(),
    replies: video.comment_count ?? 0,
    reposts: video.share_count ?? 0,
  });

// What one call came to, as Bluesky's reader has it: readings to go on
// from, or a reason to stop.
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
 * Reads the creator's posts on TikTok with the Display API's POST
 * /v2/video/query/, 20 to a call, with the channel's token, which needs
 * `video.list`: a video's likes, shares (as reposts), comments (as
 * replies) and views (as impressions). TikTok counts no quotes.
 *
 * Only public posts have an id TikTok shows, so a post known by its
 * publish_id (one only its creator sees) is missing at once, without a
 * call; so is a video TikTok does not return, deleted or no longer the
 * creator's. A channel whose creator did not allow `video.list` reads
 * nothing until it is reconnected. TikTok's 429 halts the read; a failure,
 * no answer, or an answer Acme cannot read marks the call's posts failed
 * and halts.
 */
export const tiktokMetrics = Effect.fn("TikTokMetrics.make")(
  function* tiktokMetrics(options: TikTokMetricsOptions) {
    const access = yield* ChannelAccess;
    const { api, http } = options;

    const readSome = Effect.fn("TikTokMetrics.query")(function* readSome(
      posts: readonly PostToRead[],
      token: Redacted.Redacted
    ) {
      const url = new URL("/v2/video/query/", api);

      url.searchParams.set(
        "fields",
        "id,like_count,comment_count,share_count,view_count"
      );

      const sent = yield* http
        .execute(
          HttpClientRequest.post(url).pipe(
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.bodyJsonUnsafe({
              filters: {
                video_ids: posts.map(({ platformPostId }) => platformPostId),
              },
            })
          )
        )
        .pipe(Effect.result);

      if (sent._tag === "Failure") {
        return failedOn(posts);
      }

      const response = sent.success;
      const code = yield* tiktokErrorCodeOf(response);

      if (Option.exists(code, (named) => tokenRefusalCodes.has(named))) {
        return yield* new TokenRejected();
      }

      if (Option.exists(code, (named) => scopeRefusalCodes.has(named))) {
        return yield* new ChannelUnreadable({ reason: "paused" });
      }

      if (response.status === 429) {
        return halt;
      }

      if (response.status !== 200 || !Option.contains(code, "ok")) {
        return failedOn(posts);
      }

      const found = yield* HttpClientResponse.schemaBodyJson(VideosSchema)(
        response
      ).pipe(Effect.option);

      return Option.match(found, {
        onNone: () => failedOn(posts),
        onSome: ({ data }): Call => {
          const byId = new Map(
            (data?.videos ?? []).map((video) => [video.id, video])
          );

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

    const readAll = Effect.fn("TikTokMetrics.readAll")(function* readAll(
      posts: readonly PostToRead[],
      token: Redacted.Redacted
    ) {
      const readable = posts.filter(({ platformPostId }) =>
        videoId.test(platformPostId)
      );

      const readings: PostReading[] = posts.flatMap(
        ({ platformPostId, targetId }): readonly PostReading[] =>
          videoId.test(platformPostId) ? [] : [{ _tag: "missing", targetId }]
      );

      for (const some of Arr.chunksOf(readable, idsPerCall)) {
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
      account.scopes.includes(videoListScope)
        ? access
            .withToken(account.channelId, ({ accessToken }) =>
              readAll(posts, accessToken)
            )
            .pipe(
              Effect.catchTags({
                ChannelUnusable: unusable,
                DatabaseError: databaseDown,
                TokenExpired: needsReconnect,
              })
            )
        : Effect.fail(new ChannelUnreadable({ reason: "paused" }));

    return { read };
  }
);
