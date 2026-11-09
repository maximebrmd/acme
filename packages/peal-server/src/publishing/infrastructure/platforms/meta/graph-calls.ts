import { DateTime, Effect, Match, Option } from "effect";
import type { Schema, Duration, Redacted } from "effect";
import { Mac } from "effect/crypto";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type { PublishingAccount } from "#publishing/application/platform-credentials.ts";
import {
  commitUnanswered,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { graphRefusalOf } from "#shared/infrastructure/platforms/graph-refusal.ts";
import type { GraphRefusal } from "#shared/infrastructure/platforms/graph-refusal.ts";
import { appSecretProof } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

/** The HTTP client the Meta adapters send through: the public one. */
export type MetaHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

/**
 * Which call Meta refused: one that sends or processes media (a container,
 * an unpublished photo), one that reads (a status, the account's posts), or
 * the post itself, which may have gone live when Meta fails.
 */
export type GraphCall = "media" | "read" | "post";

/** The token and proof a Graph call is made with, as request parameters. */
export interface GraphAuth {
  readonly access_token: Redacted.Redacted;
  readonly appsecret_proof?: Redacted.Redacted;
}

const rateLimited = (retryAfter: Option.Option<Duration.Duration>) =>
  Option.match(retryAfter, {
    onNone: () => new RateLimited({}),
    onSome: (wait) => new RateLimited({ retryAfter: wait }),
  });

/**
 * What Meta refusing a call means for publishing, from the Graph API's
 * "Handling Errors" page: a token that does not work is renewed once, then
 * the channel is reconnected; a rate limit waits as long as Meta's usage
 * headers say; Meta failing is the platform being down, except on the post
 * itself, whose fate is then unknown; a duplicate (506) or anything else
 * refuses the media or the post as sent. Meta's messages are never kept.
 */
export const graphRefusal = (
  call: GraphCall,
  refusal: GraphRefusal
): OutcomeUnknown | PublishFailure | TokenRejected =>
  Match.valueTags(refusal, {
    duplicate: () => new BadRequest({ code: "duplicate" }),
    rateLimited: ({ retryAfter }) => rateLimited(retryAfter),
    refused: ({ code }) =>
      call === "media" ? new MediaRejected({ code }) : new BadRequest({ code }),
    token: () => new TokenRejected(),
    unavailable: () =>
      call === "post"
        ? new OutcomeUnknown({ reason: "noResponse" })
        : new PlatformUnavailable(),
  });

/** A form body, as the Graph API takes POST parameters. */
export const formPost = (
  url: URL,
  params: Readonly<Record<string, Redacted.Redacted | string>>
) => HttpClientRequest.post(url).pipe(HttpClientRequest.bodyUrlParams(params));

/** A GET with query parameters; Redacted ones stay out of traces. */
export const query = (
  url: URL,
  params: Readonly<Record<string, Redacted.Redacted | string>>
) => HttpClientRequest.get(url).pipe(HttpClientRequest.setUrlParams(params));

/** Seconds since the epoch, as the Graph API's `since` takes them. */
export const unixSeconds = (instant: DateTime.Utc): string =>
  String(Math.floor(DateTime.toEpochMillis(instant) / 1000));

/** Parameters of a Graph call, other than its token and proof. */
export type GraphParams = Readonly<Record<string, string>>;

/** The parameters, with `name` set to `value` unless it is blank. */
export const withText = (params: GraphParams, name: string, value: string) =>
  value.trim() === "" ? params : { ...params, [name]: value };

/** A published post, with its address when the platform gave one. */
export const publishedAs = (
  postId: string,
  permalink: string | undefined
): Published => {
  const platformPostId = PlatformPostIdSchema.make(postId);

  if (permalink === undefined) {
    return { _tag: "published", platformPostId };
  }

  return { _tag: "published", permalink, platformPostId };
};

// The answer read with `schema`, or Meta's refusal.
const answered =
  <A, I>(call: GraphCall, schema: Schema.Codec<A, I>) =>
  (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<
    A,
    | HttpClientError.HttpClientError
    | OutcomeUnknown
    | PublishFailure
    | Schema.SchemaError
    | TokenRejected
  > =>
    response.status >= 200 && response.status < 300
      ? HttpClientResponse.schemaBodyJson(schema)(response)
      : graphRefusalOf(response).pipe(
          Effect.flatMap((refusal) => Effect.fail(graphRefusal(call, refusal)))
        );

/** A read with a token in hand, for what `commit` does after the post. */
export const readWith = <A, I>(
  http: MetaHttp,
  request: HttpClientRequest.HttpClientRequest,
  schema: Schema.Codec<A, I>
) => http.execute(request).pipe(Effect.flatMap(answered("read", schema)));

/**
 * Graph calls with a channel's token, through PlatformCredentials, which
 * renews a token Meta refuses once. With the app's secret, each call
 * carries its `appsecret_proof`, unless `proves` says the account's token
 * is another app's (an Instagram Login token is the Instagram app's). Each
 * request is built for the account the token is for, whose connection says
 * which host it goes to.
 */
export const graphCalls = Effect.fn("MetaGraph.calls")(
  function* graphCalls(options: {
    readonly appSecret: Option.Option<Redacted.Redacted>;
    readonly proves?: (account: PublishingAccount) => boolean;
  }) {
    const credentials = yield* PlatformCredentials;
    const mac = yield* Mac.Mac;
    const proves = options.proves ?? (() => true);

    const authOf = (
      token: Redacted.Redacted,
      account: PublishingAccount
    ): Effect.Effect<GraphAuth> =>
      Option.match(
        options.appSecret.pipe(Option.filter(() => proves(account))),
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

    /**
     * A call that makes nothing live: without an answer, whatever it did does
     * not matter, and it may be made again.
     */
    const step = <A, I>(
      post: OutgoingPost,
      http: MetaHttp,
      call: Exclude<GraphCall, "post">,
      request: (
        auth: GraphAuth,
        account: PublishingAccount
      ) => HttpClientRequest.HttpClientRequest,
      schema: Schema.Codec<A, I>
    ) =>
      credentials.withToken(post.channelId, (token) =>
        authOf(token.accessToken, token).pipe(
          Effect.flatMap((auth) => http.execute(request(auth, token))),
          Effect.flatMap(answered(call, schema)),
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
            SchemaError: unanswered,
          }),
          // A read's or an upload's own failure is the platform's, not the
          // post's: its fate is never unknown.
          Effect.catchTag("OutcomeUnknown", () =>
            Effect.fail(new PlatformUnavailable())
          )
        )
      );

    /**
     * The one request that makes the post live, then `after` with the same
     * token once it did, whose failures are ignored: the post is live either
     * way. Without an answer, the post may be live.
     */
    const commit = <A, I, B>(
      post: OutgoingPost,
      http: MetaHttp,
      request: (
        auth: GraphAuth,
        account: PublishingAccount
      ) => HttpClientRequest.HttpClientRequest,
      schema: Schema.Codec<A, I>,
      after: (
        made: A,
        auth: GraphAuth,
        account: PublishingAccount
      ) => Effect.Effect<B, unknown>,
      fallback: (made: A) => B
    ) =>
      credentials.withToken(post.channelId, (token) =>
        authOf(token.accessToken, token).pipe(
          Effect.flatMap((auth) =>
            http.execute(request(auth, token)).pipe(
              Effect.flatMap(answered("post", schema)),
              Effect.catchTags({
                HttpClientError: commitUnanswered,
                OutboundRequestRefused: commitUnanswered,
                SchemaError: commitUnanswered,
              }),
              Effect.flatMap((made) =>
                after(made, auth, token).pipe(
                  Effect.orElseSucceed(() => fallback(made))
                )
              )
            )
          )
        )
      );

    return { commit, step };
  }
);

/** A Meta media status that is a short code, kept for support. */
export const statusCodeOf = (
  message: string | undefined,
  fallback: string
): string => {
  const code = /^[A-Z][A-Z_]{2,63}$/u.exec(message?.trim() ?? "")?.[0];

  return code ?? fallback;
};
