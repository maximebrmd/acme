import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { Headers, HttpClientRequest, HttpClientResponse } from "effect/http";

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

export interface MastodonMetricsOptions {
  readonly http: PlatformHttp;
  /**
   * How an account's server is reached from its host: `https:`, or `http:`
   * for tests against a local fake.
   */
  readonly scheme: "http:" | "https:";
  /**
   * When a read stops: once the server says this few requests are left
   * (`reserve`), so the account keeps room to post, or after `deadline`,
   * so the channel's publishing does not wait long behind it.
   */
  readonly budget?: {
    readonly deadline: Duration.Duration;
    readonly reserve: number;
  };
}

// Mastodon lets an account make 300 requests in five minutes, and as many
// from one address without a token.
const defaultBudget = { deadline: Duration.seconds(30), reserve: 60 };

// The counts of GET /api/v1/statuses/:id: quotes since Mastodon 4.5.
const StatusCountsSchema = Schema.Struct({
  favourites_count: CountSchema,
  quotes_count: Schema.optionalKey(Schema.NullOr(CountSchema)),
  reblogs_count: CountSchema,
  replies_count: CountSchema,
});

const countsOf = HttpClientResponse.schemaBodyJson(StatusCountsSchema);

// The channels context names a Mastodon account `<id>@<host>`.
const accountPattern = /^[^@\s]+@(?<host>[^@\s/]+)$/u;

// Scopes that let a token read statuses: Mastodon's own.
const readingScopes: ReadonlySet<string> = new Set(["read", "read:statuses"]);

const canRead = (account: ChannelAccount) =>
  account.scopes.some((scope) => readingScopes.has(scope));

const remainingOf = (response: HttpClientResponse.HttpClientResponse) =>
  Headers.get(response.headers, "x-ratelimit-remaining").pipe(
    Option.map(Number),
    Option.filter(Number.isFinite)
  );

// What reading one status came to: a reading, or a reason to stop.
type Step =
  | { readonly _tag: "read"; readonly reading: PostReading }
  | { readonly _tag: "halt" };

const halt: Step = { _tag: "halt" };

/**
 * Reads statuses on a Mastodon server, one GET /api/v1/statuses/:id at a
 * time: their favourites, boosts, replies and, from 4.5, quotes. With the
 * account's token when it may read statuses (`read:statuses`), as the
 * channels context hands it out; without one otherwise, which public and
 * unlisted statuses allow. A status the server no longer shows (404) is
 * missing. A refused token is refused once renewed: the channel needs
 * reconnecting. A server that answers 429, fails, or has few requests
 * left halts the read.
 */
export const mastodonMetrics = Effect.fn("MastodonMetrics.make")(
  function* mastodonMetrics(options: MastodonMetricsOptions) {
    const access = yield* ChannelAccess;
    const { http, scheme } = options;
    const budget = options.budget ?? defaultBudget;

    const readOne = Effect.fn("MastodonMetrics.status")(function* readOne(
      instance: URL,
      post: PostToRead,
      token: Option.Option<Redacted.Redacted>
    ) {
      const request = HttpClientRequest.get(
        new URL(
          `/api/v1/statuses/${encodeURIComponent(post.platformPostId)}`,
          instance
        )
      ).pipe(
        Option.match(token, {
          onNone: () => (built: HttpClientRequest.HttpClientRequest) => built,
          onSome: (bearer) => HttpClientRequest.bearerToken(bearer),
        })
      );

      const sent = yield* http.execute(request).pipe(Effect.result);

      if (sent._tag === "Failure") {
        return { remaining: Option.none<number>(), step: halt };
      }

      const response = sent.success;
      const remaining = remainingOf(response);

      if (response.status === 200) {
        const counts = yield* countsOf(response).pipe(Effect.option);

        const step: Step = Option.match(counts, {
          onNone: () => halt,
          onSome: (status) => ({
            _tag: "read",
            reading: {
              _tag: "counted",
              metrics: new PostMetrics({
                impressions: Option.none(),
                likes: status.favourites_count,
                quotes: Option.fromNullishOr(status.quotes_count),
                replies: status.replies_count,
                reposts: status.reblogs_count,
              }),
              targetId: post.targetId,
            },
          }),
        });

        return { remaining, step };
      }

      // Deleted, or not shown to this reader: a followers-only status
      // without a token.
      if (response.status === 404 || response.status === 410) {
        const step: Step = {
          _tag: "read",
          reading: { _tag: "missing", targetId: post.targetId },
        };

        return { remaining, step };
      }

      if (response.status === 401 || response.status === 403) {
        // The token was refused: the channels context renews it, and asks
        // for a reconnect when that does not help. Without a token, the
        // server reads nothing for anyone signed out.
        return yield* Option.isSome(token)
          ? new TokenRejected()
          : new ChannelUnreadable({ reason: "paused" });
      }

      // Rate limited, failing, or answering what Acme does not know.
      return { remaining, step: halt };
    });

    const readAll = Effect.fn("MastodonMetrics.readAll")(function* readAll(
      instance: URL,
      posts: readonly PostToRead[],
      token: Option.Option<Redacted.Redacted>
    ) {
      const deadline = DateTime.addDuration(
        yield* DateTime.now,
        budget.deadline
      );

      const readings: PostReading[] = [];

      for (const post of posts) {
        if (DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)) {
          return { halted: true, readings };
        }

        const { remaining, step } = yield* readOne(instance, post, token);

        if (step._tag === "halt") {
          return { halted: true, readings };
        }

        readings.push(step.reading);

        if (Option.exists(remaining, (left) => left <= budget.reserve)) {
          return { halted: readings.length < posts.length, readings };
        }
      }

      const batch: MetricsBatch = { halted: false, readings };

      return batch;
    });

    const read = (
      account: ChannelAccount,
      posts: readonly PostToRead[]
    ): Effect.Effect<MetricsBatch, MetricsReadFailure> => {
      const host = accountPattern.exec(account.accountId)?.groups?.["host"];

      if (host === undefined) {
        return Effect.fail(new ChannelUnreadable({ reason: "unsupported" }));
      }

      const instance = new URL(`${scheme}//${host}`);

      return canRead(account)
        ? access
            .withToken(account.channelId, ({ accessToken }) =>
              readAll(instance, posts, Option.some(accessToken))
            )
            .pipe(
              Effect.catchTags({
                ChannelUnusable: unusable,
                DatabaseError: databaseDown,
                TokenExpired: needsReconnect,
              })
            )
        : readAll(instance, posts, Option.none()).pipe(
            Effect.catchTag("TokenRejected", () =>
              Effect.fail(new ChannelUnreadable({ reason: "paused" }))
            )
          );
    };

    return { read };
  }
);
