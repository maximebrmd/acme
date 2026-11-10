import { Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { Mac } from "effect/crypto";
import { HttpClientRequest } from "effect/http";

import { AccountCounters } from "#analytics/domain/account-metrics.ts";
import { graphAuth } from "#analytics/infrastructure/platforms/meta/graph-read.ts";
import { threadsInsightsScope } from "#analytics/infrastructure/platforms/meta/threads-metrics.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";
import { ChannelAccess } from "#channels/application/channel-access.ts";
import {
  graphUrl,
  instagramUrl,
  threadsUrl,
} from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import {
  ask,
  countOf,
  paused,
  unsupported,
  withChannelToken,
} from "./account-read.ts";
import type { AccountReader } from "./account-read.ts";

// Meta's three: an Instagram professional account, a Facebook Page and a
// Threads account. A refusal of Meta's, the token's included, makes the
// account wait a day and never marks the channel to reconnect: publishing
// and the refresh sweep find a token that stopped working.

export interface MetaAccountsOptions {
  readonly hosts: MetaHosts;
  readonly http: PlatformHttp;
  /** The secret of Meta's main app, which proves Facebook Login's calls. */
  readonly metaAppSecret: Option.Option<Redacted.Redacted>;
}

const InstagramUserSchema = Schema.Struct({
  followers_count: Schema.optionalKey(Schema.Number),
  follows_count: Schema.optionalKey(Schema.Number),
  media_count: Schema.optionalKey(Schema.Number),
});

const PageSchema = Schema.Struct({
  fan_count: Schema.optionalKey(Schema.Number),
  followers_count: Schema.optionalKey(Schema.Number),
});

// A user insight as a total: `total_value.value`.
const ThreadsInsightsSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      total_value: Schema.optionalKey(Schema.Struct({ value: Schema.Number })),
    })
  ),
});

/**
 * The readers of Meta's accounts.
 *
 * - Instagram: the IG User's `followers_count`, `follows_count` and
 *   `media_count`, with what Peal asks today (`instagram_business_basic`,
 *   or `instagram_basic` through a Page), on the host of the way in.
 * - Facebook Pages: the Page's `followers_count` (`fan_count`, its likes,
 *   where Meta gives no followers), with the Page's token and the app's
 *   proof.
 * - Threads: the `followers_count` user insight, for an account that
 *   granted `threads_manage_insights`; another has nothing Peal may read.
 */
export const metaAccounts = Effect.fn("MetaAccounts.make")(
  function* metaAccounts(options: MetaAccountsOptions) {
    const access = yield* ChannelAccess;
    const mac = yield* Mac.Mac;
    const { hosts, http } = options;

    const instagram: AccountReader = (account) =>
      withChannelToken(access, account, ({ accessToken }) =>
        Effect.gen(function* reading() {
          const direct = Option.contains(account.connection, "instagramLogin");
          const path = `/${encodeURIComponent(account.accountId)}`;

          const auth = yield* graphAuth(
            accessToken,
            direct ? Option.none() : options.metaAppSecret,
            mac
          );

          const answer = yield* ask(
            http,
            HttpClientRequest.get(
              direct ? instagramUrl(hosts, path) : graphUrl(hosts, path)
            ).pipe(
              HttpClientRequest.setUrlParams({
                ...auth,
                fields: "followers_count,follows_count,media_count",
              })
            ),
            InstagramUserSchema
          );

          if (answer._tag === "refused") {
            return yield* paused;
          }

          return {
            counters: new AccountCounters({
              followers: countOf(answer.body.followers_count),
              following: countOf(answer.body.follows_count),
              posts: countOf(answer.body.media_count),
            }),
            days: [],
          };
        })
      );

    const facebook: AccountReader = (account) =>
      withChannelToken(access, account, ({ accessToken }) =>
        Effect.gen(function* reading() {
          const auth = yield* graphAuth(
            accessToken,
            options.metaAppSecret,
            mac
          );

          const answer = yield* ask(
            http,
            HttpClientRequest.get(
              graphUrl(hosts, `/${encodeURIComponent(account.accountId)}`)
            ).pipe(
              HttpClientRequest.setUrlParams({
                ...auth,
                fields: "followers_count,fan_count",
              })
            ),
            PageSchema
          );

          if (answer._tag === "refused") {
            return yield* paused;
          }

          return {
            counters: new AccountCounters({
              followers: countOf(
                answer.body.followers_count ?? answer.body.fan_count
              ),
            }),
            days: [],
          };
        })
      );

    const threads: AccountReader = (account) =>
      account.scopes.includes(threadsInsightsScope)
        ? withChannelToken(access, account, ({ accessToken }) =>
            Effect.gen(function* reading() {
              const answer = yield* ask(
                http,
                HttpClientRequest.get(
                  threadsUrl(
                    hosts,
                    `/${encodeURIComponent(account.accountId)}/threads_insights`
                  )
                ).pipe(
                  HttpClientRequest.setUrlParams({
                    access_token: accessToken,
                    metric: "followers_count",
                  })
                ),
                ThreadsInsightsSchema
              );

              if (answer._tag === "refused") {
                return yield* paused;
              }

              return {
                counters: new AccountCounters({
                  followers: countOf(
                    answer.body.data.find(
                      ({ name }) => name === "followers_count"
                    )?.total_value?.value
                  ),
                }),
                days: [],
              };
            })
          )
        : Effect.fail(unsupported);

    return { facebook, instagram, threads };
  }
);
