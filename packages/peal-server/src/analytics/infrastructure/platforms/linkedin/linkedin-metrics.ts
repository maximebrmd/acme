import { Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
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

export interface LinkedInMetricsOptions {
  /** LinkedIn's API origin: `https://api.linkedin.com`. */
  readonly api: URL;
  readonly http: PlatformHttp;
  /** The API version every call names (`Linkedin-Version`). */
  readonly version: string;
}

// The scope the statistics need, with the member's ADMINISTRATOR role.
const statisticsScope = "rw_organization_admin";

const shareUrn = /^urn:li:share:\d+$/u;
const ugcPostUrn = /^urn:li:ugcPost:\d+$/u;

// LinkedIn says a like count "can become negative"; no count Peal keeps is.
const CountSchema = Schema.Number;

const StatisticsSchema = Schema.Struct({
  elements: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        share: Schema.optionalKey(Schema.String),
        totalShareStatistics: Schema.Struct({
          commentCount: Schema.optionalKey(CountSchema),
          impressionCount: Schema.optionalKey(CountSchema),
          likeCount: Schema.optionalKey(CountSchema),
          shareCount: Schema.optionalKey(CountSchema),
        }),
        ugcPost: Schema.optionalKey(Schema.String),
      })
    )
  ),
});

type Statistics = NonNullable<
  (typeof StatisticsSchema.Type)["elements"]
>[number]["totalShareStatistics"];

const statisticsOf = HttpClientResponse.schemaBodyJson(StatisticsSchema);

// A count as Peal keeps it: whole, never negative, within what it stores.
const count = (value: number | undefined) =>
  Math.min(Math.max(Math.trunc(value ?? 0), 0), maxCount);

// Organic statistics: comments are replies, shares reposts. LinkedIn
// counts no quotes, and its clicks have no place in Peal's counts yet.
const metricsOf = (statistics: Statistics) =>
  new PostMetrics({
    impressions: Option.some(count(statistics.impressionCount)),
    likes: count(statistics.likeCount),
    quotes: Option.none(),
    replies: count(statistics.commentCount),
    reposts: count(statistics.shareCount),
  });

// "Shares that are not returned can be assumed to have counts of 0 for
// all statistics."
const nothingYet = metricsOf({});

// A Rest.li 2.0 list of URNs: its parentheses and commas as they are, each
// URN percent-encoded.
const listOf = (urns: readonly string[]) =>
  `List(${urns.map((urn) => encodeURIComponent(urn)).join(",")})`;

const missing = (targetId: PostToRead["targetId"]): PostReading => ({
  _tag: "missing",
  targetId,
});

type Call =
  | { readonly _tag: "read"; readonly readings: readonly PostReading[] }
  | { readonly _tag: "halt" };

/**
 * Reads a company page's posts with LinkedIn's organization share
 * statistics (`organizationalEntityShareStatistics`, lifetime, organic):
 * one call for all the posts asked, 25 at most, shares and ugcPosts each in
 * their list. It is a finder, which the Community Management API's
 * Development tier allows, where it refuses batch reads. Impressions,
 * likes, comments (replies) and shares (reposts) are kept; a post LinkedIn
 * leaves out has had no impression nor action, and counts 0.
 *
 * The statistics need `rw_organization_admin` and the member to be the
 * page's ADMINISTRATOR. A member's profile has no statistics an app like
 * Peal's may read (`r_member_postAnalytics` covers the signed-in member's
 * own posts, for approved apps): its channel is `unsupported`, as is a
 * page whose member LinkedIn refuses the statistics (403), which is about
 * their role, never a token to renew. Only a 401 refuses the token. A rate
 * limit, a retired API version or an outage halts the read.
 */
export const linkedinMetrics = Effect.fn("LinkedInMetrics.make")(
  function* linkedinMetrics(options: LinkedInMetricsOptions) {
    const access = yield* ChannelAccess;
    const { api, http, version } = options;

    const readPosts = Effect.fn("LinkedInMetrics.statistics")(
      function* readPosts(
        account: ChannelAccount,
        posts: readonly PostToRead[],
        token: Redacted.Redacted
      ) {
        const urns = posts.map(({ platformPostId }) => String(platformPostId));
        const shares = urns.filter((urn) => shareUrn.test(urn));
        const ugcPosts = urns.filter((urn) => ugcPostUrn.test(urn));

        if (shares.length === 0 && ugcPosts.length === 0) {
          const none: Call = {
            _tag: "read",
            readings: posts.map(({ targetId }) => missing(targetId)),
          };

          return none;
        }

        // The query is written whole, as Rest.li 2.0 reads it: a URL's
        // parameters set one by one would have their parentheses encoded.
        const query = [
          "q=organizationalEntity",
          `organizationalEntity=${encodeURIComponent(account.accountId)}`,
          ...(shares.length === 0 ? [] : [`shares=${listOf(shares)}`]),
          ...(ugcPosts.length === 0 ? [] : [`ugcPosts=${listOf(ugcPosts)}`]),
        ].join("&");

        const request = HttpClientRequest.get(
          `${new URL("/rest/organizationalEntityShareStatistics", api).href}?${query}`
        ).pipe(
          HttpClientRequest.bearerToken(token),
          HttpClientRequest.setHeaders({
            "Linkedin-Version": version,
            "X-Restli-Protocol-Version": "2.0.0",
          })
        );

        const sent = yield* http.execute(request).pipe(Effect.result);

        if (sent._tag === "Failure") {
          const halted: Call = { _tag: "halt" };

          return halted;
        }

        const response = sent.success;

        if (response.status === 401) {
          return yield* new TokenRejected();
        }

        if (response.status === 403) {
          return yield* new ChannelUnreadable({ reason: "unsupported" });
        }

        if (response.status === 426) {
          yield* Effect.logError(
            "LinkedIn retired the API version Peal sends: set LINKEDIN_API_VERSION"
          );
        }

        const found =
          response.status === 200
            ? yield* statisticsOf(response).pipe(Effect.option)
            : Option.none();

        if (Option.isNone(found)) {
          const halted: Call = { _tag: "halt" };

          return halted;
        }

        const byUrn = new Map(
          (found.value.elements ?? []).map((element) => [
            element.share ?? element.ugcPost ?? "",
            element.totalShareStatistics,
          ])
        );

        const read: Call = {
          _tag: "read",
          readings: posts.map(({ platformPostId, targetId }): PostReading => {
            const urn = String(platformPostId);

            if (!shareUrn.test(urn) && !ugcPostUrn.test(urn)) {
              return missing(targetId);
            }

            const statistics = byUrn.get(urn);

            return {
              _tag: "counted",
              metrics:
                statistics === undefined ? nothingYet : metricsOf(statistics),
              targetId,
            };
          }),
        };

        return read;
      }
    );

    const read = (
      account: ChannelAccount,
      posts: readonly PostToRead[]
    ): Effect.Effect<MetricsBatch, MetricsReadFailure> => {
      if (
        !Option.contains(account.connection, "linkedinPage") ||
        !account.scopes.includes(statisticsScope)
      ) {
        return Effect.fail(new ChannelUnreadable({ reason: "unsupported" }));
      }

      return access
        .withToken(account.channelId, ({ accessToken }) =>
          readPosts(account, posts, accessToken)
        )
        .pipe(
          Effect.map((call): MetricsBatch =>
            call._tag === "read"
              ? { halted: false, readings: call.readings }
              : { halted: true, readings: [] }
          ),
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );
    };

    return { read };
  }
);
