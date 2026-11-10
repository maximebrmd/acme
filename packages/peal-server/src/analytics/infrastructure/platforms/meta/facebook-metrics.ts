import { Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { Mac } from "effect/crypto";

import type {
  MetricsBatch,
  MetricsReadFailure,
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
import { graphUrl } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import {
  graphAuth,
  graphRead,
  insightOf,
  InsightsSchema,
  readEach,
  unreadPost,
} from "./graph-read.ts";
import type { PostRead } from "./graph-read.ts";

export interface FacebookMetricsOptions {
  /** Where Meta's services are. */
  readonly hosts: MetaHosts;
  readonly http: PlatformHttp;
  /** The secret of Meta's main app, which proves a Page's calls. */
  readonly metaAppSecret: Option.Option<Redacted.Redacted>;
}

// The permission a Page's insights need, which Peal does not ask for yet:
// Meta grants it after an app review. A Page connected with it has its
// posts' views and clicks read too.
const insightsScope = "read_insights";

// A Page post's `shares` field: left out while nobody shared it.
const PostSchema = Schema.Struct({
  shares: Schema.optionalKey(
    Schema.Struct({ count: Schema.optionalKey(CountSchema) })
  ),
});

// An edge read for its summary alone: `total_count`.
const SummarySchema = Schema.Struct({
  summary: Schema.optionalKey(
    Schema.Struct({ total_count: Schema.optionalKey(CountSchema) })
  ),
});

/**
 * Reads a Facebook Page's posts with the Page's token and the app's proof,
 * from the Graph API's Page Post, Reactions and Comments references: the
 * post's `shares` (reposts), its reactions edge's `summary=total_count`
 * (likes: every reaction), and its comments edge's summary with
 * `filter=stream`, which counts replies to comments too (replies). Three
 * calls a post, with what Peal asks today (`pages_read_engagement`).
 *
 * Views and clicks are a Page's insights (`post_media_view`, `post_clicks`
 * on the post's insights edge), which need `read_insights`: a Page
 * connected with it has them read in a fourth call, and one without has
 * none, which is not zero. Insights that cannot be read leave the post
 * its other counts.
 *
 * A post Meta does not know is missing; a rate limit halts the read; any
 * other refusal, the token's included, fails the post and halts, without
 * marking the channel to reconnect.
 */
export const facebookMetrics = Effect.fn("FacebookMetrics.make")(
  function* facebookMetrics(options: FacebookMetricsOptions) {
    const access = yield* ChannelAccess;
    const mac = yield* Mac.Mac;
    const { hosts, http } = options;

    const readOne = Effect.fn("FacebookMetrics.post")(function* readOne(
      account: ChannelAccount,
      post: PostToRead,
      token: Redacted.Redacted
    ) {
      const auth = yield* graphAuth(token, options.metaAppSecret, mac);
      const path = `/${encodeURIComponent(post.platformPostId)}`;

      const found = yield* graphRead(http, PostSchema, graphUrl(hosts, path), {
        ...auth,
        fields: "shares",
      });

      if (found._tag !== "found") {
        return unreadPost(found, post);
      }

      const reactions = yield* graphRead(
        http,
        SummarySchema,
        graphUrl(hosts, `${path}/reactions`),
        { ...auth, limit: "0", summary: "total_count" }
      );

      if (reactions._tag !== "found") {
        return unreadPost(reactions, post);
      }

      const comments = yield* graphRead(
        http,
        SummarySchema,
        graphUrl(hosts, `${path}/comments`),
        { ...auth, filter: "stream", limit: "0", summary: "1" }
      );

      if (comments._tag !== "found") {
        return unreadPost(comments, post);
      }

      const insights = account.scopes.includes(insightsScope)
        ? yield* graphRead(
            http,
            InsightsSchema,
            graphUrl(hosts, `${path}/insights`),
            { ...auth, metric: "post_media_view,post_clicks" }
          )
        : undefined;

      const insight = (name: string) =>
        insights?._tag === "found"
          ? insightOf(insights.body, name)
          : Option.none<number>();

      const read: PostRead = {
        _tag: "read",
        reading: {
          _tag: "counted",
          metrics: new PostMetrics({
            clicks: insight("post_clicks"),
            impressions: insight("post_media_view"),
            likes: reactions.body.summary?.total_count ?? 0,
            // A Page's post has no quotes.
            quotes: Option.none(),
            replies: comments.body.summary?.total_count ?? 0,
            reposts: found.body.shares?.count ?? 0,
          }),
          targetId: post.targetId,
        },
      };

      return read;
    });

    const read = (
      account: ChannelAccount,
      posts: readonly PostToRead[]
    ): Effect.Effect<MetricsBatch, MetricsReadFailure> =>
      access
        .withToken(account.channelId, ({ accessToken }) =>
          readEach(posts, (post) => readOne(account, post, accessToken))
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
