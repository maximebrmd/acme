import { Array as Arr, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import type {
  MetricsBatch,
  MetricsReadFailure,
  MetricsRequest,
  PostReading,
  PostToRead,
} from "#analytics/application/metrics-reader.ts";
import { PaidReads } from "#analytics/application/paid-reads.ts";
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
import { isJsonRefusal } from "#shared/infrastructure/platforms/json-refusal.ts";

export interface XMetricsOptions {
  /** The API's origin: `https://api.x.com`. */
  readonly api: URL;
  /**
   * Whether the operator turned X reads on (`X_ANALYTICS`): X bills the
   * server's app for each post a read returns, so they are off unless set.
   */
  readonly enabled: boolean;
  readonly http: PlatformHttp;
}

// GET /2/tweets takes 100 ids at most.
const idsPerCall = 100;

// What the post lookup needs of a user's token.
const readScopes = ["tweet.read", "users.read"] as const;

// X's ids are digits; a post known by anything else cannot be looked up.
const postId = /^\d{1,19}$/u;

// A post's public metrics. X names reposts `repost_count`, and
// `retweet_count` in older answers.
const PublicMetricsSchema = Schema.Struct({
  bookmark_count: Schema.optionalKey(CountSchema),
  impression_count: Schema.optionalKey(CountSchema),
  like_count: Schema.optionalKey(CountSchema),
  quote_count: Schema.optionalKey(CountSchema),
  reply_count: Schema.optionalKey(CountSchema),
  repost_count: Schema.optionalKey(CountSchema),
  retweet_count: Schema.optionalKey(CountSchema),
});

const PostSchema = Schema.Struct({
  id: Schema.String,
  public_metrics: Schema.optionalKey(PublicMetricsSchema),
});

// The posts found come in `data`; one X no longer shows is left out of it,
// and named in `errors` beside, in an answer that is still a 200.
const PostsSchema = Schema.Struct({
  data: Schema.optionalKey(Schema.Array(PostSchema)),
});

const postsOf = HttpClientResponse.schemaBodyJson(PostsSchema);

// The counts X gave. None when it left out a like, reply or repost count:
// the post is then not counted this time, rather than counted as zero.
const metricsOf = (
  metrics: typeof PublicMetricsSchema.Type
): Option.Option<PostMetrics> =>
  Option.all({
    likes: Option.fromUndefinedOr(metrics.like_count),
    replies: Option.fromUndefinedOr(metrics.reply_count),
    reposts: Option.fromUndefinedOr(
      metrics.repost_count ?? metrics.retweet_count
    ),
  }).pipe(
    Option.map(
      (counts) =>
        new PostMetrics({
          ...counts,
          impressions: Option.fromUndefinedOr(metrics.impression_count),
          quotes: Option.fromUndefinedOr(metrics.quote_count),
          saves: Option.fromUndefinedOr(metrics.bookmark_count),
        })
    )
  );

type Call =
  | {
      readonly _tag: "read";
      readonly readings: readonly PostReading[];
      // The posts X returned, which it bills.
      readonly returned: readonly string[];
    }
  | { readonly _tag: "failed"; readonly readings: readonly PostReading[] }
  | { readonly _tag: "halt" };

const halt: Call = { _tag: "halt" };

const failedOn = (posts: readonly PostToRead[]): Call => ({
  _tag: "failed",
  readings: posts.map(({ targetId }) => ({ _tag: "failed", targetId })),
});

const missing = ({ targetId }: PostToRead): PostReading => ({
  _tag: "missing",
  targetId,
});

/**
 * Reads posts on X with the post lookup (`GET /2/tweets`), 100 ids to a
 * call, asking `public_metrics` with the channel's token (`tweet.read`,
 * `users.read`): impressions, likes, reposts, replies, quotes, and
 * bookmarks as saves.
 *
 * X bills the server's app for each post a read returns, once a UTC day
 * for the same post. So the reader reads nothing unless the operator
 * turned X reads on, and takes each read from the workspace's allowance
 * for the day first (PaidReads): what the allowance does not cover is left
 * unread, due again at the next run, and the read is halted.
 *
 * A post the answer leaves out is missing: deleted, or no longer shown. A
 * 401 refuses the token. A rate limit, a usage cap or a balance spent (402,
 * 403, 429) halts the read; a failure, or an answer Peal cannot read, marks
 * the call's posts failed and halts.
 */
export const xMetrics = Effect.fn("XMetrics.make")(function* xMetrics(
  options: XMetricsOptions
) {
  const access = yield* ChannelAccess;
  const paid = yield* PaidReads;
  const { api, http } = options;

  const readSome = Effect.fn("XMetrics.posts")(function* readSome(
    posts: readonly PostToRead[],
    token: Redacted.Redacted
  ) {
    const request = HttpClientRequest.get(new URL("/2/tweets", api)).pipe(
      HttpClientRequest.setUrlParams({
        ids: posts.map(({ platformPostId }) => platformPostId).join(","),
        "tweet.fields": "public_metrics",
      }),
      HttpClientRequest.bearerToken(token)
    );

    const sent = yield* http.execute(request).pipe(Effect.result);

    if (sent._tag === "Failure") {
      return failedOn(posts);
    }

    const response = sent.success;

    // X's own refusal of the token; a 401 page from something on the way
    // halts the read instead, and leaves the channel as it is.
    if (response.status === 401) {
      return (yield* isJsonRefusal(response))
        ? yield* new TokenRejected()
        : halt;
    }

    if ([402, 403, 429].includes(response.status)) {
      return halt;
    }

    if (response.status !== 200) {
      return failedOn(posts);
    }

    const found = yield* postsOf(response).pipe(Effect.option);

    return Option.match(found, {
      onNone: () => failedOn(posts),
      onSome: ({ data }): Call => {
        const byId = new Map((data ?? []).map((post) => [post.id, post]));

        return {
          _tag: "read",
          returned: posts.flatMap(({ platformPostId }) =>
            byId.has(platformPostId) ? [platformPostId] : []
          ),
          readings: posts.map((post): PostReading => {
            const metrics = byId.get(post.platformPostId)?.public_metrics;

            if (metrics === undefined) {
              return missing(post);
            }

            return Option.match(metricsOf(metrics), {
              onNone: (): PostReading => ({
                _tag: "failed",
                targetId: post.targetId,
              }),
              onSome: (counted): PostReading => ({
                _tag: "counted",
                metrics: counted,
                targetId: post.targetId,
              }),
            });
          }),
        };
      },
    });
  });

  // `returned` keeps every post X returned, across the calls and the
  // retries a renewed token makes, whatever ends the read after them.
  const readAll = Effect.fn("XMetrics.readAll")(function* readAll(
    posts: readonly PostToRead[],
    token: Redacted.Redacted,
    returned: Set<string>
  ) {
    const readings: PostReading[] = [];

    for (const some of Arr.chunksOf(posts, idsPerCall)) {
      const call = yield* readSome(some, token);

      if (call._tag !== "halt") {
        readings.push(...call.readings);
      }

      if (call._tag !== "read") {
        return { halted: true, readings };
      }

      for (const id of call.returned) {
        returned.add(id);
      }
    }

    return { halted: false, readings };
  });

  const read = (
    account: ChannelAccount,
    request: MetricsRequest
  ): Effect.Effect<MetricsBatch, MetricsReadFailure> =>
    Effect.gen(function* reading() {
      if (!options.enabled) {
        return yield* new ChannelUnreadable({ reason: "unsupported" });
      }

      // A read is billed to a workspace: one that names none reads nothing.
      if (
        request.workspaceId === undefined ||
        !readScopes.every((scope) => account.scopes.includes(scope))
      ) {
        return yield* new ChannelUnreadable({ reason: "paused" });
      }

      const { workspaceId } = request;

      // A workspace that does not read X (on a server that bills, its X
      // reads off) is skipped as paused, before anything is claimed.
      if (
        !(yield* paid
          .reads(workspaceId, "x")
          .pipe(Effect.catchTag("DatabaseError", databaseDown)))
      ) {
        return yield* new ChannelUnreadable({ reason: "paused" });
      }

      const known = request.posts.filter(({ platformPostId }) =>
        postId.test(platformPostId)
      );

      const unknown = request.posts
        .filter(({ platformPostId }) => !postId.test(platformPostId))
        .map(missing);

      const claimed = yield* paid
        .claim({
          platform: "x",
          resources: known.map(({ platformPostId }) => platformPostId),
          workspaceId,
        })
        .pipe(Effect.catchTag("DatabaseError", databaseDown));

      const covered = new Set(claimed.resources);

      // X bills only the posts it returns: what it returned of them is
      // kept here, and those counted fresh for the day that it did not
      // return go back, however the read ends.
      const returned = new Set<string>();

      // Built when it runs: by then `returned` holds what X answered.
      const releaseRest = Effect.suspend(() =>
        paid.release({
          at: claimed.at,
          platform: "x",
          resources: claimed.fresh.filter((id) => !returned.has(id)),
          workspaceId,
        })
      ).pipe(Effect.catchTag("DatabaseError", databaseDown));

      const allowed = known.filter(({ platformPostId }) =>
        covered.has(platformPostId)
      );

      // The posts the day's allowance does not cover wait for their next
      // turn, each by itself: the read goes on for those already paid for
      // today, which cost nothing more, and the run for the channel.
      const unpaid = known
        .filter(({ platformPostId }) => !covered.has(platformPostId))
        .map(({ targetId }): PostReading => ({ _tag: "unpaid", targetId }));

      if (allowed.length === 0) {
        return { halted: false, readings: [...unknown, ...unpaid] };
      }

      const batch = yield* access
        .withToken(account.channelId, ({ accessToken }) =>
          readAll(allowed, accessToken, returned)
        )
        .pipe(
          Effect.tapError(() => releaseRest),
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );

      yield* releaseRest;

      return {
        halted: batch.halted,
        readings: [...batch.readings, ...unknown, ...unpaid],
      };
    });

  return { read };
});
