import { Array as Arr, Effect, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import type {
  MetricsBatch,
  PostReading,
  PostToRead,
} from "#analytics/application/metrics-reader.ts";
import { CountSchema, PostMetrics } from "#analytics/domain/post-metrics.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";

export interface BlueskyMetricsOptions {
  /**
   * The AppView that serves posts to anyone: Bluesky's public one, whose
   * answers are cached for a short while.
   */
  readonly appView: URL;
  readonly http: PlatformHttp;
}

// app.bsky.feed.getPosts takes 25 AT-URIs at most.
const urisPerCall = 25;

// The counts of an app.bsky.feed.defs#postView; each is optional in the
// lexicon, and absent means none yet.
const PostViewSchema = Schema.Struct({
  likeCount: Schema.optionalKey(CountSchema),
  quoteCount: Schema.optionalKey(CountSchema),
  replyCount: Schema.optionalKey(CountSchema),
  repostCount: Schema.optionalKey(CountSchema),
  uri: Schema.String,
});

const PostsSchema = Schema.Struct({ posts: Schema.Array(PostViewSchema) });

const postsOf = HttpClientResponse.schemaBodyJson(PostsSchema);

const metricsOf = (view: typeof PostViewSchema.Type) =>
  new PostMetrics({
    impressions: Option.none(),
    likes: view.likeCount ?? 0,
    quotes: Option.some(view.quoteCount ?? 0),
    replies: view.replyCount ?? 0,
    reposts: view.repostCount ?? 0,
  });

// What one call came to: readings to go on from, or a reason to stop. An
// AppView that slows the read down leaves the posts due; one that fails on
// them, or answers what Peal cannot read, makes them wait for their next
// turn, so posts it cannot show hold nothing back.
type Call =
  | { readonly _tag: "read"; readonly readings: readonly PostReading[] }
  | { readonly _tag: "failed"; readonly readings: readonly PostReading[] }
  | { readonly _tag: "halt" };

const halt: Call = { _tag: "halt" };

const failedOn = (posts: readonly PostToRead[]): Call => ({
  _tag: "failed",
  readings: posts.map(({ targetId }) => ({ _tag: "failed", targetId })),
});

/**
 * Reads posts on Bluesky with app.bsky.feed.getPosts, 25 to a call, from
 * the public AppView: a post's likes, reposts, replies and quotes are
 * public on the AT Protocol, so no session is needed, and the account's
 * scope stays what posting needs. A post the AppView does not return is
 * missing: deleted, or hidden by moderation; so are all of a request the
 * AppView refuses (400). An AppView that answers 429 halts the read; one
 * that fails, does not answer, or answers what Peal cannot read, marks the
 * call's posts failed and halts.
 */
export const blueskyMetrics = (options: BlueskyMetricsOptions) => {
  const { appView, http } = options;

  const readSome = Effect.fn("BlueskyMetrics.getPosts")(function* readSome(
    posts: readonly PostToRead[]
  ) {
    const url = new URL("/xrpc/app.bsky.feed.getPosts", appView);

    for (const { platformPostId } of posts) {
      url.searchParams.append("uris", platformPostId);
    }

    const sent = yield* http
      .execute(HttpClientRequest.get(url))
      .pipe(Effect.result);

    if (sent._tag === "Failure") {
      return failedOn(posts);
    }

    // A request the AppView cannot read names no post it has.
    if (sent.success.status === 400) {
      const missing: Call = {
        _tag: "read",
        readings: posts.map(({ targetId }) => ({ _tag: "missing", targetId })),
      };

      return missing;
    }

    if (sent.success.status === 429) {
      return halt;
    }

    if (sent.success.status !== 200) {
      return failedOn(posts);
    }

    const found = yield* postsOf(sent.success).pipe(Effect.option);

    return Option.match(found, {
      onNone: () => failedOn(posts),
      onSome: ({ posts: views }): Call => {
        const byUri = new Map(views.map((view) => [view.uri, view]));

        return {
          _tag: "read",
          readings: posts.map(({ platformPostId, targetId }): PostReading => {
            const view = byUri.get(platformPostId);

            return view === undefined
              ? { _tag: "missing", targetId }
              : { _tag: "counted", metrics: metricsOf(view), targetId };
          }),
        };
      },
    });
  });

  const read = Effect.fn("BlueskyMetrics.read")(function* read(
    posts: readonly PostToRead[]
  ) {
    const readings: PostReading[] = [];

    for (const some of Arr.chunksOf(posts, urisPerCall)) {
      const call = yield* readSome(some);

      if (call._tag !== "halt") {
        readings.push(...call.readings);
      }

      if (call._tag !== "read") {
        const halted: MetricsBatch = { halted: true, readings };

        return halted;
      }
    }

    const batch: MetricsBatch = { halted: false, readings };

    return batch;
  });

  return { read };
};
