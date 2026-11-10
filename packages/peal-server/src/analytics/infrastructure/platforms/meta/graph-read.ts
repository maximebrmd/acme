import { Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { Mac } from "effect/crypto";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import type {
  MetricsBatch,
  PostReading,
  PostToRead,
} from "#analytics/application/metrics-reader.ts";
import { CountSchema } from "#analytics/domain/post-metrics.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";
import { graphRefusalOf } from "#shared/infrastructure/platforms/graph-refusal.ts";
import { appSecretProof } from "#shared/infrastructure/platforms/meta-graph.ts";

// Reads of Meta's Graph hosts that Facebook Pages' and Threads' readers
// share: one GET, and what its answer means for the post it is about.

/**
 * What a Graph read came to: the body Peal asked for, a post Meta does
 * not know (code 100: deleted, or never this account's), a rate limit, or
 * anything else, which fails the post: a refusal, no answer, or a body
 * Peal cannot read. A refused token is a failure too, never a reason to
 * mark the channel to reconnect: publishing and the refresh sweep find a
 * token that stopped working, and a read for insights the account never
 * granted must not stop its publishing.
 */
export type GraphRead<A> =
  | { readonly _tag: "found"; readonly body: A }
  | { readonly _tag: "missing" }
  | { readonly _tag: "rateLimited" }
  | { readonly _tag: "failed" };

/** What authenticates a Graph call: the token, and the app's proof of it. */
export interface GraphAuth {
  readonly access_token: Redacted.Redacted;
  readonly appsecret_proof?: Redacted.Redacted;
}

/** The token, with the app's proof when the app has a secret. */
export const graphAuth = (
  token: Redacted.Redacted,
  appSecret: Option.Option<Redacted.Redacted>,
  mac: Mac.Mac["Service"]
): Effect.Effect<GraphAuth> =>
  Option.match(appSecret, {
    onNone: () => Effect.succeed({ access_token: token }),
    onSome: (secret) =>
      appSecretProof(token, secret).pipe(
        Effect.provideService(Mac.Mac, mac),
        Effect.map((proof) => ({ access_token: token, appsecret_proof: proof }))
      ),
  });

/** Reads `url` with these parameters, and its JSON body with `schema`. */
export const graphRead = <A, I>(
  http: PlatformHttp,
  schema: Schema.Codec<A, I>,
  url: URL,
  params: Readonly<Record<string, Redacted.Redacted | string>>
): Effect.Effect<GraphRead<A>> =>
  Effect.gen(function* reading() {
    const sent = yield* http
      .execute(
        HttpClientRequest.get(url).pipe(HttpClientRequest.setUrlParams(params))
      )
      .pipe(Effect.result);

    if (sent._tag === "Failure") {
      return { _tag: "failed" };
    }

    const response = sent.success;

    if (response.status === 200) {
      const body = yield* HttpClientResponse.schemaBodyJson(schema)(
        response
      ).pipe(Effect.option);

      return Option.match(body, {
        onNone: (): GraphRead<A> => ({ _tag: "failed" }),
        onSome: (found): GraphRead<A> => ({ _tag: "found", body: found }),
      });
    }

    const refusal = yield* graphRefusalOf(response);

    if (refusal._tag === "rateLimited") {
      return { _tag: "rateLimited" };
    }

    return refusal._tag === "refused" && refusal.code.startsWith("graph100")
      ? { _tag: "missing" }
      : { _tag: "failed" };
  });

const ValueSchema = Schema.Struct({ value: CountSchema });

/**
 * Insights as Meta writes them: each metric by name, with its lifetime
 * value in `values` or in `total_value`.
 */
export const InsightsSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      total_value: Schema.optionalKey(ValueSchema),
      values: Schema.optionalKey(Schema.Array(ValueSchema)),
    })
  ),
});

/** The value of one metric of some insights, if Meta gave it. */
export const insightOf = (
  insights: typeof InsightsSchema.Type,
  name: string
): Option.Option<number> =>
  Option.fromUndefinedOr(
    insights.data.find((insight) => insight.name === name)
  ).pipe(
    Option.flatMap((insight) =>
      Option.fromUndefinedOr(
        insight.total_value?.value ?? insight.values?.[0]?.value
      )
    )
  );

/** What reading one post came to: its reading, or a halt before or at it. */
export type PostRead =
  | { readonly _tag: "read"; readonly reading: PostReading }
  | { readonly _tag: "halt"; readonly reading: Option.Option<PostReading> };

/**
 * What a Graph read that is not `found` means for its post: missing, a
 * halt that leaves it due (a rate limit), or a halt that fails it.
 */
export const unreadPost = (
  read: Exclude<GraphRead<unknown>, { readonly _tag: "found" }>,
  post: PostToRead
): PostRead => {
  if (read._tag === "missing") {
    return {
      _tag: "read",
      reading: { _tag: "missing", targetId: post.targetId },
    };
  }

  return {
    _tag: "halt",
    reading:
      read._tag === "rateLimited"
        ? Option.none()
        : Option.some({ _tag: "failed", targetId: post.targetId }),
  };
};

/** Reads the posts one after the other with `readOne`, until one halts. */
export const readEach = Effect.fn("MetaGraph.readEach")(function* readEach(
  posts: readonly PostToRead[],
  readOne: (post: PostToRead) => Effect.Effect<PostRead>
) {
  const readings: PostReading[] = [];

  for (const post of posts) {
    const read = yield* readOne(post);

    if (read._tag === "halt") {
      readings.push(...Option.toArray(read.reading));

      const halted: MetricsBatch = { halted: true, readings };

      return halted;
    }

    readings.push(read.reading);
  }

  const batch: MetricsBatch = { halted: false, readings };

  return batch;
});
