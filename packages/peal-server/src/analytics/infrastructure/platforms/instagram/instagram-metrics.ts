import { Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { Mac } from "effect/crypto";
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
import { graphRefusalOf } from "#shared/infrastructure/platforms/graph-refusal.ts";
import {
  appSecretProof,
  graphUrl,
  instagramUrl,
} from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

export interface InstagramMetricsOptions {
  /** Where Meta's services are. */
  readonly hosts: MetaHosts;
  readonly http: PlatformHttp;
  /**
   * The secret of Meta's main app, whose `appsecret_proof` signs the calls
   * of the accounts reached through Facebook Login; none when the server
   * has no Meta app.
   */
  readonly metaAppSecret: Option.Option<Redacted.Redacted>;
}

// The permission each way in gives the insights for.
const insightsScope = {
  facebookLogin: "instagram_manage_insights",
  instagramLogin: "instagram_business_manage_insights",
} as const;

// From the Instagram Platform's "Insights" page and the IG Media Insights
// reference: `views` (which replaced impressions in 2025), `likes`,
// `comments` and `shares`, for a feed post, a carousel or a reel. Each
// metric comes with its lifetime value in `values` or in `total_value`.
const metrics = "views,likes,comments,shares";

const ValueSchema = Schema.Struct({ value: CountSchema });

const InsightSchema = Schema.Struct({
  name: Schema.String,
  total_value: Schema.optionalKey(ValueSchema),
  values: Schema.optionalKey(Schema.Array(ValueSchema)),
});

const InsightsSchema = Schema.Struct({ data: Schema.Array(InsightSchema) });

const insightsOf = HttpClientResponse.schemaBodyJson(InsightsSchema);

const metricsOf = (insights: typeof InsightsSchema.Type) => {
  const valueOf = (name: string) =>
    Option.fromUndefinedOr(
      insights.data.find((insight) => insight.name === name)
    ).pipe(
      Option.flatMap((insight) =>
        Option.fromUndefinedOr(
          insight.total_value?.value ?? insight.values?.[0]?.value
        )
      )
    );

  return new PostMetrics({
    impressions: valueOf("views"),
    likes: Option.getOrElse(valueOf("likes"), () => 0),
    // Instagram has no quotes.
    quotes: Option.none(),
    replies: Option.getOrElse(valueOf("comments"), () => 0),
    reposts: Option.getOrElse(valueOf("shares"), () => 0),
  });
};

// An account connected with Instagram Login is read on Instagram's host,
// with its own token and no proof.
const viaInstagramLogin = (account: ChannelAccount) =>
  Option.contains(account.connection, "instagramLogin");

// What reading one post came to: its reading, or a halt before it.
type Read =
  | { readonly _tag: "read"; readonly reading: PostReading }
  | { readonly _tag: "halt"; readonly reading: Option.Option<PostReading> };

const halt = (reading: Option.Option<PostReading>): Read => ({
  _tag: "halt",
  reading,
});

/**
 * Reads Instagram posts' counts with the media insights endpoint, one post
 * a call, with the channel's token, when the account granted the insights
 * permission of its way in: on `graph.instagram.com` for an account
 * connected with Instagram Login, on `graph.facebook.com` with its Page's
 * token and the app's proof for one reached through Facebook Login. An
 * account that declined insights reads nothing (`paused`), until it is
 * connected again with them. Views count as impressions, comments as
 * replies, shares as reposts.
 *
 * A post Meta does not know (code 100: deleted, or the container a post
 * was known by before its own id) is missing. A rate limit halts the read;
 * any other refusal, no answer, or one Peal cannot read marks the post
 * failed and halts. A refusal of the token is one too: insights refuse a
 * token for a post they have no counts for (code 10), which must not mark
 * the channel to reconnect and stop its publishing, so publishing and the
 * refresh sweep, never analytics, find a token that stopped working.
 */
export const instagramMetrics = Effect.fn("InstagramMetrics.make")(
  function* instagramMetrics(options: InstagramMetricsOptions) {
    const access = yield* ChannelAccess;
    const mac = yield* Mac.Mac;
    const { hosts, http } = options;

    const authOf = (account: ChannelAccount, token: Redacted.Redacted) =>
      Option.match(
        options.metaAppSecret.pipe(
          Option.filter(() => !viaInstagramLogin(account))
        ),
        {
          onNone: () => Effect.succeed({ access_token: token }),
          onSome: (secret) =>
            appSecretProof(token, secret).pipe(
              Effect.provideService(Mac.Mac, mac),
              Effect.map((proof) => ({
                access_token: token,
                appsecret_proof: proof,
              }))
            ),
        }
      );

    const readOne = Effect.fn("InstagramMetrics.post")(function* readOne(
      account: ChannelAccount,
      post: PostToRead,
      token: Redacted.Redacted
    ) {
      const path = `/${encodeURIComponent(post.platformPostId)}/insights`;

      const request = HttpClientRequest.get(
        viaInstagramLogin(account)
          ? instagramUrl(hosts, path)
          : graphUrl(hosts, path)
      ).pipe(
        HttpClientRequest.setUrlParams({
          ...(yield* authOf(account, token)),
          metric: metrics,
        })
      );

      const failed: PostReading = { _tag: "failed", targetId: post.targetId };
      const sent = yield* http.execute(request).pipe(Effect.result);

      if (sent._tag === "Failure") {
        return halt(Option.some(failed));
      }

      const response = sent.success;

      if (response.status === 200) {
        const found = yield* insightsOf(response).pipe(Effect.option);

        return Option.match(found, {
          onNone: () => halt(Option.some(failed)),
          onSome: (insights): Read => ({
            _tag: "read",
            reading: {
              _tag: "counted",
              metrics: metricsOf(insights),
              targetId: post.targetId,
            },
          }),
        });
      }

      const refusal = yield* graphRefusalOf(response);

      if (refusal._tag === "rateLimited") {
        return halt(Option.none());
      }

      if (refusal._tag === "refused" && refusal.code.startsWith("graph100")) {
        const missing: Read = {
          _tag: "read",
          reading: { _tag: "missing", targetId: post.targetId },
        };

        return missing;
      }

      return halt(Option.some(failed));
    });

    const readAll = Effect.fn("InstagramMetrics.readAll")(function* readAll(
      account: ChannelAccount,
      posts: readonly PostToRead[],
      token: Redacted.Redacted
    ) {
      const readings: PostReading[] = [];

      for (const post of posts) {
        const read = yield* readOne(account, post, token);

        if (read._tag === "read") {
          readings.push(read.reading);
        } else {
          readings.push(...Option.toArray(read.reading));

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
    ): Effect.Effect<MetricsBatch, MetricsReadFailure> => {
      const scope = viaInstagramLogin(account)
        ? insightsScope.instagramLogin
        : insightsScope.facebookLogin;

      return account.scopes.includes(scope)
        ? access
            .withToken(account.channelId, ({ accessToken }) =>
              readAll(account, posts, accessToken)
            )
            .pipe(
              Effect.catchTags({
                ChannelUnusable: unusable,
                DatabaseError: databaseDown,
                TokenExpired: needsReconnect,
              })
            )
        : Effect.fail(new ChannelUnreadable({ reason: "paused" }));
    };

    return { read };
  }
);
