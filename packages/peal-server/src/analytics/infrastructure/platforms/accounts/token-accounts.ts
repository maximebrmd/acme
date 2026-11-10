import { Effect, Option, Schema } from "effect";
import { HttpClientRequest } from "effect/http";

import { PaidReads } from "#analytics/application/paid-reads.ts";
import { AccountCounters } from "#analytics/domain/account-metrics.ts";
import { databaseDown } from "#analytics/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";
import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { isJsonRefusal } from "#shared/infrastructure/platforms/json-refusal.ts";
import {
  tiktokAnswer,
  tiktokErrorCodeOf,
  tokenRefusalCodes,
} from "#shared/infrastructure/platforms/tiktok-api.ts";

import {
  ask,
  countOf,
  paused,
  unsupported,
  withChannelToken,
} from "./account-read.ts";
import type { AccountReader } from "./account-read.ts";

// YouTube, TikTok and X: one call with the channel's token.

// The API writes counts as strings.
const { NumberFromString } = Schema;

const YouTubeChannelsSchema = Schema.Struct({
  items: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        statistics: Schema.optionalKey(
          Schema.Struct({
            hiddenSubscriberCount: Schema.optionalKey(Schema.Boolean),
            subscriberCount: Schema.optionalKey(NumberFromString),
            videoCount: Schema.optionalKey(NumberFromString),
          })
        ),
      })
    )
  ),
});

/**
 * Reads a YouTube channel with channels.list (`part=statistics`, one unit
 * of quota), with the channel's token (`youtube.readonly`): its
 * subscribers, which YouTube rounds down to three significant figures and
 * leaves out of what Peal keeps when the owner hides them
 * (`hiddenSubscriberCount`), and its public videos. Its total views pass
 * what a count holds, and are not kept. A 401 refuses the token; a 403 is
 * the quota, and puts the read off.
 */
export const youtubeAccounts = Effect.fn("YouTubeAccounts.make")(
  function* youtubeAccounts(options: {
    readonly api: URL;
    readonly http: PlatformHttp;
  }) {
    const access = yield* ChannelAccess;

    const reader: AccountReader = (account) =>
      withChannelToken(access, account, ({ accessToken }) =>
        Effect.gen(function* reading() {
          const answer = yield* ask(
            options.http,
            HttpClientRequest.get(
              new URL("/youtube/v3/channels", options.api)
            ).pipe(
              HttpClientRequest.setUrlParams({
                id: account.accountId,
                part: "statistics",
              }),
              HttpClientRequest.bearerToken(accessToken)
            ),
            YouTubeChannelsSchema
          );

          if (answer._tag === "refused") {
            return yield* answer.response.status === 401 &&
            (yield* isJsonRefusal(answer.response))
              ? new TokenRejected()
              : new PlatformUnavailable();
          }

          const statistics = answer.body.items?.[0]?.statistics;

          return {
            counters: new AccountCounters({
              followers:
                statistics?.hiddenSubscriberCount === true
                  ? Option.none()
                  : countOf(statistics?.subscriberCount),
              posts: countOf(statistics?.videoCount),
            }),
            days: [],
          };
        })
      );

    return reader;
  }
);

/**
 * The scope TikTok's user statistics need, which its apps ask for in a
 * review: Peal asks creators for it only where the operator says its app
 * has it.
 */
export const tiktokStatsScope = "user.info.stats";

const TikTokUserSchema = tiktokAnswer(
  Schema.Struct({
    user: Schema.Struct({
      follower_count: Schema.optionalKey(Schema.Number),
      following_count: Schema.optionalKey(Schema.Number),
      video_count: Schema.optionalKey(Schema.Number),
    }),
  })
);

/**
 * Reads a TikTok creator with the user info endpoint (`follower_count`,
 * `following_count`, `video_count`), for a creator who granted
 * `user.info.stats`; another has nothing Peal may read.
 */
export const tiktokAccounts = Effect.fn("TikTokAccounts.make")(
  function* tiktokAccounts(options: {
    readonly api: URL;
    readonly http: PlatformHttp;
  }) {
    const access = yield* ChannelAccess;

    const reader: AccountReader = (account) =>
      account.scopes.includes(tiktokStatsScope)
        ? withChannelToken(access, account, ({ accessToken }) =>
            Effect.gen(function* reading() {
              const answer = yield* ask(
                options.http,
                HttpClientRequest.get(
                  new URL("/v2/user/info/", options.api)
                ).pipe(
                  HttpClientRequest.setUrlParams({
                    fields: "follower_count,following_count,video_count",
                  }),
                  HttpClientRequest.bearerToken(accessToken)
                ),
                TikTokUserSchema
              );

              if (answer._tag === "refused") {
                const code = yield* tiktokErrorCodeOf(answer.response);

                return yield* Option.exists(code, (named) =>
                  tokenRefusalCodes.has(named)
                )
                  ? new TokenRejected()
                  : paused;
              }

              const user = answer.body.data?.user;

              return {
                counters: new AccountCounters({
                  followers: countOf(user?.follower_count),
                  following: countOf(user?.following_count),
                  posts: countOf(user?.video_count),
                }),
                days: [],
              };
            })
          )
        : Effect.fail(unsupported);

    return reader;
  }
);

// A user's public metrics; X names its posts `post_count`, and
// `tweet_count` in older answers.
const XUserSchema = Schema.Struct({
  data: Schema.Struct({
    public_metrics: Schema.optionalKey(
      Schema.Struct({
        followers_count: Schema.optionalKey(Schema.Number),
        following_count: Schema.optionalKey(Schema.Number),
        post_count: Schema.optionalKey(Schema.Number),
        tweet_count: Schema.optionalKey(Schema.Number),
      })
    ),
  }),
});

const xReadScopes = ["tweet.read", "users.read"] as const;

/**
 * Reads an X account with `GET /2/users/me` (`user.fields=public_metrics`)
 * and the channel's token. X bills the server's app for each user a read
 * returns, so nothing is read unless the operator turned X reads on, and
 * each read is taken from the workspace's allowance for the day first:
 * once it is spent, the read is put off to a later run.
 */
export const xAccounts = Effect.fn("XAccounts.make")(
  function* xAccounts(options: {
    readonly api: URL;
    readonly enabled: boolean;
    readonly http: PlatformHttp;
  }) {
    const access = yield* ChannelAccess;
    const paid = yield* PaidReads;

    const reader =
      (workspaceId: WorkspaceId): AccountReader =>
      (account) =>
        Effect.gen(function* reading() {
          if (!options.enabled) {
            return yield* unsupported;
          }

          if (!xReadScopes.every((scope) => account.scopes.includes(scope))) {
            return yield* paused;
          }

          const resource = `user:${account.accountId}`;

          const covered = yield* paid
            .claim({ platform: "x", resources: [resource], workspaceId })
            .pipe(Effect.catchTag("DatabaseError", databaseDown));

          if (!covered.includes(resource)) {
            return yield* new PlatformUnavailable();
          }

          return yield* withChannelToken(access, account, ({ accessToken }) =>
            Effect.gen(function* asking() {
              const answer = yield* ask(
                options.http,
                HttpClientRequest.get(new URL("/2/users/me", options.api)).pipe(
                  HttpClientRequest.setUrlParams({
                    "user.fields": "public_metrics",
                  }),
                  HttpClientRequest.bearerToken(accessToken)
                ),
                XUserSchema
              );

              if (answer._tag === "refused") {
                return yield* answer.response.status === 401 &&
                (yield* isJsonRefusal(answer.response))
                  ? new TokenRejected()
                  : new PlatformUnavailable();
              }

              const metrics = answer.body.data.public_metrics;

              return {
                counters: new AccountCounters({
                  followers: countOf(metrics?.followers_count),
                  following: countOf(metrics?.following_count),
                  posts: countOf(metrics?.post_count ?? metrics?.tweet_count),
                }),
                days: [],
              };
            })
          );
        });

    return reader;
  }
);
