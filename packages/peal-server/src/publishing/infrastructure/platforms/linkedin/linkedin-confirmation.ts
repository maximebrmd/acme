import { DateTime, Duration, Effect, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import type { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type { LookUp } from "#publishing/application/publication-steps.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

import { commentaryOf } from "./linkedin-post-body.ts";
import { mediaRefusal } from "./linkedin-refusal.ts";
import { authorUrnOf, restCall } from "./linkedin-rest.ts";

type Http = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

// How many of the page's newest posts are read: the one just sent is
// among the first, unless the page posts ten times in a few minutes.
const recentPosts = 10;

// How far LinkedIn's clock may be behind Peal's: a post made no earlier
// than this before the attempt started is this attempt's.
const clockSkew = Duration.minutes(1);

// A post, as the finder answers it: its URN, its commentary in little
// text, and when it was made, in milliseconds.
const RecentPostsSchema = Schema.Struct({
  elements: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        commentary: Schema.optionalKey(Schema.String),
        createdAt: Schema.optionalKey(Schema.Number),
        id: Schema.String,
        lifecycleState: Schema.optionalKey(Schema.String),
      })
    )
  ),
});

/**
 * Looks a page's post up after its answer was lost, among the page's
 * newest posts (the Posts API's `q=author` finder, which a page's token
 * reads with `r_organization_social`): the one made since the attempt
 * started whose commentary is the very text Peal sent. LinkedIn has no
 * idempotency key, and a search proves no post absent, so the answer is
 * `found` or `unknown`, and a post is never sent twice. A page that posted
 * the same text a moment before is answered that post: the text is live,
 * once.
 *
 * One call, a finder, which the Community Management API's Development
 * tier allows (it refuses batch reads).
 */
export const pageLookUp =
  (options: {
    readonly api: Http;
    readonly apiUrl: URL;
    readonly credentials: PlatformCredentials["Service"];
    readonly published: (urn: string) => Published;
    readonly version: string;
  }) =>
  (post: OutgoingPost): Effect.Effect<LookUp, PublishFailure> => {
    const rest = restCall(options.version);
    const author = authorUrnOf(post.accountId);
    const sent = commentaryOf(post);

    const since = DateTime.toEpochMillis(
      DateTime.subtractDuration(post.startedAt, clockSkew)
    );

    return options.credentials
      .withToken(post.channelId, ({ accessToken }) =>
        options.api
          .execute(
            rest(
              HttpClientRequest.get(
                new URL("/rest/posts", options.apiUrl)
              ).pipe(
                HttpClientRequest.setUrlParams({
                  author,
                  count: String(recentPosts),
                  q: "author",
                  sortBy: "CREATED",
                }),
                HttpClientRequest.setHeader("X-RestLi-Method", "FINDER")
              ),
              accessToken
            )
          )
          .pipe(
            Effect.flatMap(
              (
                response
              ): Effect.Effect<
                typeof RecentPostsSchema.Type,
                | HttpClientError.HttpClientError
                | PublishFailure
                | Schema.SchemaError
                | TokenRejected
              > =>
                response.status === 200
                  ? HttpClientResponse.schemaBodyJson(RecentPostsSchema)(
                      response
                    )
                  : mediaRefusal(response)
            ),
            Effect.catchTags({
              HttpClientError: unanswered,
              OutboundRequestRefused: unanswered,
              SchemaError: unanswered,
            })
          )
      )
      .pipe(
        Effect.map(({ elements = [] }): LookUp => {
          const found = elements.find(
            ({ commentary, createdAt, lifecycleState }) =>
              (commentary ?? "") === sent &&
              (createdAt ?? 0) >= since &&
              (lifecycleState ?? "PUBLISHED") === "PUBLISHED"
          );

          return found === undefined
            ? { _tag: "unknown" }
            : { _tag: "found", published: options.published(found.id) };
        })
      );
  };
