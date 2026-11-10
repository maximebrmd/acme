import { DateTime, Effect, Layer, Option, Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { SqlClient } from "effect/sql";

import type { PaidReads } from "#analytics/application/paid-reads.ts";
import { TrackedPosts } from "#analytics/application/tracked-posts.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import {
  endCollection,
  recordReading,
  trackPublication,
} from "#analytics/domain/tracked-post.ts";
import type { Publication } from "#analytics/domain/tracked-post.ts";
import { platformMetricsReaderWith } from "#analytics/infrastructure/platforms/platform-metrics-reader.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { paidReadsOf } from "#test/analytics/fakes/memory-paid-reads.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

// Stand-ins for what analytics reads from other contexts and platforms,
// and synthetic posts and counts.

/** Counts as a platform gives them; quotes only when given. */
export const countsOf = (
  likes: number,
  reposts: number,
  replies: number,
  quotes?: number
) =>
  new PostMetrics({
    impressions: Option.none(),
    likes,
    quotes: Option.fromUndefinedOr(quotes),
    replies,
    reposts,
  });

/** A post that went live on the channel at `publishedAt`, with new ids. */
export const publicationOf = (
  workspaceId: WorkspaceId,
  channelId: ChannelId,
  publishedAt: string,
  platformPostId = "110000000000000001"
) =>
  Effect.gen(function* newPublication() {
    const publication: Publication = {
      channelId,
      permalink: Option.some(`https://mastodon.test/@alice/${platformPostId}`),
      platformPostId: PlatformPostIdSchema.make(platformPostId),
      postId: yield* newId(PostIdSchema),
      publishedAt: DateTime.makeUnsafe(publishedAt),
      targetId: yield* newId(PostTargetIdSchema),
      workspaceId,
    };

    return publication;
  });

/** A new channel id. */
export const newChannelId = newId(ChannelIdSchema);

/**
 * The platforms' readers over plain HTTP, against fakes: Mastodon servers
 * at the host the account names, Bluesky's AppView at `appView`, TikTok's
 * API at `tiktokApi`, the YouTube Data API at `youtubeApi`, Pinterest's
 * API at `pinterestApi`, and both of
 * Meta's Graph hosts at `metaGraph`, whose Facebook Login calls are proved
 * with `metaAppSecret`.
 */
export const readersWith = ({
  appView = "http://127.0.0.1:9",
  linkedinApi = "http://127.0.0.1:9",
  linkedinVersion = "202610",
  metaAppSecret = "meta-app-secret-synthetic",
  metaGraph = "http://127.0.0.1:9",
  pinterestApi = "http://127.0.0.1:9",
  paidReads = paidReadsOf(1000),
  tiktokApi = "http://127.0.0.1:9",
  xApi = "http://127.0.0.1:9",
  xReads = true,
  youtubeApi = "http://127.0.0.1:9",
}: {
  readonly appView?: string | undefined;
  readonly linkedinApi?: string | undefined;
  readonly linkedinVersion?: string | undefined;
  readonly metaAppSecret?: string | undefined;
  readonly metaGraph?: string | undefined;
  readonly pinterestApi?: string | undefined;
  readonly paidReads?: Layer.Layer<PaidReads> | undefined;
  readonly tiktokApi?: string | undefined;
  readonly xApi?: string | undefined;
  readonly xReads?: boolean | undefined;
  readonly youtubeApi?: string | undefined;
} = {}) => {
  const graph = new URL(metaGraph);

  const metaHosts: MetaHosts = {
    facebookDialog: graph,
    facebookGraph: graph,
    instagramApi: graph,
    instagramAuthorize: graph,
    instagramGraph: graph,
    threadsAuthorize: graph,
    threadsGraph: graph,
  };

  return platformMetricsReaderWith({
    blueskyAppView: new URL(appView),
    linkedinApi: new URL(linkedinApi),
    linkedinVersion,
    mastodonScheme: "http:",
    metaAppSecret: Option.some(Redacted.make(metaAppSecret)),
    metaHosts,
    pinterestApi: new URL(pinterestApi),
    tiktokApi: new URL(tiktokApi),
    xApi: new URL(xApi),
    xReads,
    youtubeApi: new URL(youtubeApi),
  }).pipe(
    Layer.provide(
      Layer.mergeAll(
        FetchHttpClient.layer,
        OpenOutboundGuard,
        paidReads,
        Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
      )
    )
  );
};

/** A reading of a seeded post: when, and what it counted. */
export interface SeededReading {
  readonly at: string;
  readonly metrics: PostMetrics;
}

/**
 * A post followed in Postgres, read at each of `readings` in turn, then no
 * longer read: no run of the collection picks it up.
 */
export const seedPost = Effect.fn("test.seedPost")(function* seedPost(
  publication: Publication,
  readings: readonly SeededReading[]
) {
  const tracked = yield* TrackedPosts;
  let post = trackPublication(publication);

  yield* tracked.track([post]);

  for (const { at, metrics } of readings) {
    const collectedAt = DateTime.makeUnsafe(at);

    post = recordReading(post, metrics, collectedAt, collectedAt);
    yield* tracked.saveReading(post);
  }

  yield* tracked.saveSchedule(
    endCollection(post, "window", DateTime.makeUnsafe("2050-01-01T00:00:00Z"))
  );

  return publication;
});

/**
 * Has Postgres count the analytics tables again, after a test put tens of
 * thousands of rows in them at once. Autovacuum does it within a minute,
 * as in production; until then the planner takes the tables for as small
 * as they were, and every suite sharing the database pays for it: a join
 * of the two reads one whole table for each row of the other, and the
 * cascade from a post to its snapshots, planned once a session, reads
 * every snapshot for each post deleted. Seconds become minutes, and tests
 * elsewhere time out.
 */
export const countTablesAgain = SqlClient.SqlClient.use(
  (sql) => sql`ANALYZE analytics.tracked_posts, analytics.metric_snapshots`
).pipe(Effect.orDie, Effect.asVoid);

/** Deletes what analytics stored for the workspace, snapshots included. */
export const forgetWorkspace = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.all([
      sql`DELETE FROM analytics.tracked_posts WHERE workspace_id = ${workspaceId}`,
      sql`DELETE FROM analytics.erased_workspaces WHERE workspace_id = ${workspaceId}`,
    ])
  ).pipe(Effect.orDie);
