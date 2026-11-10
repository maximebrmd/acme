import { DateTime, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest } from "effect/http";

import {
  AccountCounters,
  utcDayOf,
  UtcDaySchema,
} from "#analytics/domain/account-metrics.ts";
import type { AccountDay } from "#analytics/domain/account-metrics.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";
import { ChannelAccess } from "#channels/application/channel-access.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { isJsonRefusal } from "#shared/infrastructure/platforms/json-refusal.ts";
import { pinterestErrorCodeOf } from "#shared/infrastructure/platforms/pinterest-api.ts";

import {
  ask,
  countOf,
  paused,
  unsupported,
  withChannelToken,
} from "./account-read.ts";
import type { AccountReader } from "./account-read.ts";

// Pinterest and LinkedIn pages: the account, and what the platform counted
// each day, which both date themselves.

// How many finished days each read asks again: platforms revise a day for
// a while after it ends.
const daysBack = 3;

const decodeDay = Schema.decodeUnknownOption(UtcDaySchema);

const PinterestAccountSchema = Schema.Struct({
  follower_count: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  following_count: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  pin_count: Schema.optionalKey(Schema.NullOr(Schema.Number)),
});

// The analytics of an account, unsplit: Pinterest answers them under
// `all`, each day with its date, whether it is final, and its metrics.
const PinterestAnalyticsSchema = Schema.Struct({
  all: Schema.optionalKey(
    Schema.Struct({
      daily_metrics: Schema.optionalKey(
        Schema.Array(
          Schema.Struct({
            data_status: Schema.optionalKey(Schema.String),
            date: Schema.String,
            metrics: Schema.optionalKey(
              Schema.Struct({
                IMPRESSION: Schema.optionalKey(Schema.NullOr(Schema.Number)),
              })
            ),
          })
        )
      ),
    })
  ),
});

/**
 * Reads a Pinterest account with `GET /v5/user_account`
 * (`follower_count`, `following_count`, `pin_count`) and its impressions
 * of the last three finished days with `GET /v5/user_account/analytics`
 * (`metric_types=IMPRESSION`), both with `user_accounts:read`. A day
 * Pinterest is still counting (its `data_status` is not `READY`) is left
 * for a later read. Analytics that cannot be read leave the account its
 * counters. A 401 with Pinterest's own error refuses the token.
 */
export const pinterestAccounts = Effect.fn("PinterestAccounts.make")(
  function* pinterestAccounts(options: {
    readonly api: URL;
    readonly http: PlatformHttp;
  }) {
    const access = yield* ChannelAccess;
    const { api, http } = options;

    const daysOf = Effect.fn("PinterestAccounts.days")(function* daysOf(
      token: Redacted.Redacted
    ) {
      const today = yield* DateTime.now;

      const answer = yield* ask(
        http,
        HttpClientRequest.get(new URL("/v5/user_account/analytics", api)).pipe(
          HttpClientRequest.setUrlParams({
            end_date: utcDayOf(DateTime.subtract(today, { days: 1 })),
            metric_types: "IMPRESSION",
            start_date: utcDayOf(DateTime.subtract(today, { days: daysBack })),
          }),
          HttpClientRequest.bearerToken(token)
        ),
        PinterestAnalyticsSchema
      ).pipe(Effect.option);

      if (Option.isNone(answer) || answer.value._tag === "refused") {
        return [];
      }

      return (answer.value.body.all?.daily_metrics ?? []).flatMap(
        (counted): AccountDay[] => {
          const day = decodeDay(counted.date);
          const views = countOf(counted.metrics?.IMPRESSION ?? undefined);

          return counted.data_status === "READY" &&
            Option.isSome(day) &&
            Option.isSome(views)
            ? [{ day: day.value, reach: Option.none(), views }]
            : [];
        }
      );
    });

    const reader: AccountReader = (account) =>
      withChannelToken(access, account, ({ accessToken }) =>
        Effect.gen(function* reading() {
          const answer = yield* ask(
            http,
            HttpClientRequest.get(new URL("/v5/user_account", api)).pipe(
              HttpClientRequest.bearerToken(accessToken)
            ),
            PinterestAccountSchema
          );

          if (answer._tag === "refused") {
            const refusedToken =
              answer.response.status === 401 &&
              Option.isSome(yield* pinterestErrorCodeOf(answer.response));

            return yield* refusedToken ? new TokenRejected() : paused;
          }

          return {
            counters: new AccountCounters({
              followers: countOf(answer.body.follower_count ?? undefined),
              following: countOf(answer.body.following_count ?? undefined),
              posts: countOf(answer.body.pin_count ?? undefined),
            }),
            days: yield* daysOf(accessToken),
          };
        })
      );

    return reader;
  }
);

// The scope a page's statistics need, with the member's ADMINISTRATOR role.
const organizationScope = "rw_organization_admin";

const NetworkSizeSchema = Schema.Struct({
  firstDegreeSize: Schema.optionalKey(Schema.Number),
});

// The page's organic share statistics, one element a day, each with the
// range it covers in milliseconds.
const DailyStatisticsSchema = Schema.Struct({
  elements: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        timeRange: Schema.Struct({ start: Schema.Number }),
        totalShareStatistics: Schema.Struct({
          impressionCount: Schema.optionalKey(Schema.Number),
          uniqueImpressionsCount: Schema.optionalKey(Schema.Number),
        }),
      })
    )
  ),
});

/**
 * Reads a LinkedIn company page: its followers with `networkSizes`
 * (`edgeType=COMPANY_FOLLOWED_BY_MEMBER`, `firstDegreeSize`), and the
 * impressions and unique impressions of its posts for each of the last
 * three finished UTC days with the time-bound
 * `organizationalEntityShareStatistics` (`timeGranularityType:DAY`,
 * organic). Both need `rw_organization_admin`: a member's profile, and a
 * page LinkedIn refuses them for (403, the member's role), have nothing
 * Peal may read. Statistics that cannot be read leave the page its
 * followers. Only a 401 refuses the token.
 */
export const linkedinAccounts = Effect.fn("LinkedInAccounts.make")(
  function* linkedinAccounts(options: {
    readonly api: URL;
    readonly http: PlatformHttp;
    readonly version: string;
  }) {
    const access = yield* ChannelAccess;
    const { api, http, version } = options;

    const headers = {
      "Linkedin-Version": version,
      "X-Restli-Protocol-Version": "2.0.0",
    };

    const daysOf = Effect.fn("LinkedInAccounts.days")(function* daysOf(
      urn: string,
      token: Redacted.Redacted
    ) {
      const end = DateTime.startOf(yield* DateTime.now, "day");
      const start = DateTime.subtract(end, { days: daysBack });

      // Written whole, as Rest.li 2.0 reads it: its parentheses stay.
      const query = [
        "q=organizationalEntity",
        `organizationalEntity=${encodeURIComponent(urn)}`,
        `timeIntervals=(timeRange:(start:${DateTime.toEpochMillis(start)},end:${DateTime.toEpochMillis(end)}),timeGranularityType:DAY)`,
      ].join("&");

      const answer = yield* ask(
        http,
        HttpClientRequest.get(
          `${new URL("/rest/organizationalEntityShareStatistics", api).href}?${query}`
        ).pipe(
          HttpClientRequest.bearerToken(token),
          HttpClientRequest.setHeaders(headers)
        ),
        DailyStatisticsSchema
      ).pipe(Effect.option);

      if (Option.isNone(answer) || answer.value._tag === "refused") {
        return [];
      }

      // A day whose start is no instant is left out: one malformed day
      // never fails the account's read.
      return (answer.value.body.elements ?? []).flatMap(
        ({ timeRange, totalShareStatistics }): AccountDay[] =>
          Option.toArray(DateTime.make(timeRange.start)).map((begins) => ({
            day: utcDayOf(begins),
            reach: countOf(totalShareStatistics.uniqueImpressionsCount),
            views: countOf(totalShareStatistics.impressionCount),
          }))
      );
    });

    const reader: AccountReader = (account) =>
      Option.contains(account.connection, "linkedinPage") &&
      account.scopes.includes(organizationScope)
        ? withChannelToken(access, account, ({ accessToken }) =>
            Effect.gen(function* reading() {
              const answer = yield* ask(
                http,
                HttpClientRequest.get(
                  new URL(
                    `/rest/networkSizes/${encodeURIComponent(account.accountId)}`,
                    api
                  )
                ).pipe(
                  HttpClientRequest.setUrlParams({
                    edgeType: "COMPANY_FOLLOWED_BY_MEMBER",
                  }),
                  HttpClientRequest.bearerToken(accessToken),
                  HttpClientRequest.setHeaders(headers)
                ),
                NetworkSizeSchema
              );

              if (answer._tag === "refused") {
                const { status } = answer.response;

                if (status === 401) {
                  return yield* (yield* isJsonRefusal(answer.response))
                    ? new TokenRejected()
                    : new PlatformUnavailable();
                }

                return yield* status === 403
                  ? unsupported
                  : new PlatformUnavailable();
              }

              return {
                counters: new AccountCounters({
                  followers: countOf(answer.body.firstDegreeSize),
                }),
                days: yield* daysOf(account.accountId, accessToken),
              };
            })
          )
        : Effect.fail(unsupported);

    return reader;
  }
);
