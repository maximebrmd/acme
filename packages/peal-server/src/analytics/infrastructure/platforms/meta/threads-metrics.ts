import { Effect, Option } from "effect";
import type { Redacted } from "effect";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import type {
  MetricsBatch,
  MetricsReadFailure,
  PostToRead,
} from "#analytics/application/metrics-reader.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#analytics/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";
import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { threadsUrl } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import {
  graphRead,
  insightOf,
  InsightsSchema,
  readEach,
  unreadPost,
} from "./graph-read.ts";
import type { PostRead } from "./graph-read.ts";

export interface ThreadsMetricsOptions {
  /** Where Meta's services are. */
  readonly hosts: MetaHosts;
  readonly http: PlatformHttp;
}

/**
 * The permission Threads' insights need, "Required for making GET calls to
 * insights endpoints". Meta grants it after an app review, so Peal asks for
 * it only where the operator says its app has it.
 */
export const threadsInsightsScope = "threads_manage_insights";

// From the Threads API's "Insights" page: a post's `views`, `likes`,
// `replies`, `reposts` and `quotes`, each with its lifetime value.
const metrics = "views,likes,replies,reposts,quotes";

/**
 * Reads Threads posts' counts with the media insights endpoint, one post a
 * call, with the account's token, when it granted
 * `threads_manage_insights`; an account that did not reads nothing
 * (`paused`), until it is connected again with it. Views count as
 * impressions.
 *
 * A post Meta does not know is missing; a rate limit halts the read; any
 * other refusal, the token's included, fails the post and halts, without
 * marking the channel to reconnect.
 */
export const threadsMetrics = Effect.fn("ThreadsMetrics.make")(
  function* threadsMetrics(options: ThreadsMetricsOptions) {
    const access = yield* ChannelAccess;
    const { hosts, http } = options;

    const readOne = Effect.fn("ThreadsMetrics.post")(function* readOne(
      post: PostToRead,
      token: Redacted.Redacted
    ) {
      const found = yield* graphRead(
        http,
        InsightsSchema,
        threadsUrl(
          hosts,
          `/${encodeURIComponent(post.platformPostId)}/insights`
        ),
        { access_token: token, metric: metrics }
      );

      if (found._tag !== "found") {
        return unreadPost(found, post);
      }

      const count = (name: string) => insightOf(found.body, name);

      // A metric Threads left out gives none: the post is not counted this
      // time, rather than counted as zero.
      const read: PostRead = Option.match(
        Option.all({
          likes: count("likes"),
          replies: count("replies"),
          reposts: count("reposts"),
        }),
        {
          onNone: (): PostRead => ({
            _tag: "read",
            reading: { _tag: "failed", targetId: post.targetId },
          }),
          onSome: (counts): PostRead => ({
            _tag: "read",
            reading: {
              _tag: "counted",
              metrics: new PostMetrics({
                ...counts,
                impressions: count("views"),
                quotes: count("quotes"),
              }),
              targetId: post.targetId,
            },
          }),
        }
      );

      return read;
    });

    const read = (
      account: ChannelAccount,
      posts: readonly PostToRead[]
    ): Effect.Effect<MetricsBatch, MetricsReadFailure> =>
      account.scopes.includes(threadsInsightsScope)
        ? access
            .withToken(account.channelId, ({ accessToken }) =>
              readEach(posts, (post) => readOne(post, accessToken))
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
