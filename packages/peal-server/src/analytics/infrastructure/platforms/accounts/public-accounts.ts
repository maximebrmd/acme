import { Effect, Schema } from "effect";
import { HttpClientRequest } from "effect/http";

import { AccountCounters } from "#analytics/domain/account-metrics.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";

import { ask, countOf, paused } from "./account-read.ts";
import type { AccountReader } from "./account-read.ts";

// The two platforms whose accounts are public: read without a token.

// The channels context names a Mastodon account `<id>@<host>`.
const mastodonAccount = /^(?<id>[^@\s]+)@(?<host>[^@\s/]+)$/u;

// Mastodon's Account entity: "The reported followers of this profile",
// its follows and its statuses.
const MastodonAccountSchema = Schema.Struct({
  followers_count: Schema.optionalKey(Schema.Number),
  following_count: Schema.optionalKey(Schema.Number),
  statuses_count: Schema.optionalKey(Schema.Number),
});

/**
 * Reads a Mastodon account with `GET /api/v1/accounts/:id` on its own
 * server, which is public ("OAuth: Public"): no token is sent. A count a
 * server reports below zero, as some do for hidden ones, is none.
 */
export const mastodonAccounts =
  (options: {
    readonly http: PlatformHttp;
    readonly scheme: "http:" | "https:";
  }): AccountReader =>
  (account) =>
    Effect.gen(function* reading() {
      const named = mastodonAccount.exec(account.accountId)?.groups;
      const host = named?.["host"];
      const id = named?.["id"];

      if (host === undefined || id === undefined) {
        return yield* paused;
      }

      const answer = yield* ask(
        options.http,
        HttpClientRequest.get(
          new URL(
            `/api/v1/accounts/${encodeURIComponent(id)}`,
            `${options.scheme}//${host}`
          )
        ).pipe(HttpClientRequest.acceptJson),
        MastodonAccountSchema
      );

      if (answer._tag === "refused") {
        return yield* paused;
      }

      return {
        counters: new AccountCounters({
          followers: countOf(answer.body.followers_count),
          following: countOf(answer.body.following_count),
          posts: countOf(answer.body.statuses_count),
        }),
        days: [],
      };
    });

// `app.bsky.actor.defs#profileViewDetailed`: each count is optional.
const BlueskyProfileSchema = Schema.Struct({
  followersCount: Schema.optionalKey(Schema.Number),
  followsCount: Schema.optionalKey(Schema.Number),
  postsCount: Schema.optionalKey(Schema.Number),
});

/**
 * Reads a Bluesky account with `app.bsky.actor.getProfile` on the public
 * AppView, by its DID, without the session, whose scope stays what posting
 * needs.
 */
export const blueskyAccounts =
  (options: {
    readonly appView: URL;
    readonly http: PlatformHttp;
  }): AccountReader =>
  (account) =>
    Effect.gen(function* reading() {
      const answer = yield* ask(
        options.http,
        HttpClientRequest.get(
          new URL("/xrpc/app.bsky.actor.getProfile", options.appView)
        ).pipe(HttpClientRequest.setUrlParams({ actor: account.accountId })),
        BlueskyProfileSchema
      );

      if (answer._tag === "refused") {
        return yield* paused;
      }

      return {
        counters: new AccountCounters({
          followers: countOf(answer.body.followersCount),
          following: countOf(answer.body.followsCount),
          posts: countOf(answer.body.postsCount),
        }),
        days: [],
      };
    });
