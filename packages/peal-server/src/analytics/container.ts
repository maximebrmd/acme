import { Layer } from "effect";

import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import { CollectMetrics } from "#analytics/application/collect-metrics.ts";
import type { MetricsReader } from "#analytics/application/metrics-reader.ts";
import { DrizzleAnalyticsRecords } from "#analytics/infrastructure/drizzle-analytics-records.ts";
import { DrizzleTrackedPosts } from "#analytics/infrastructure/drizzle-tracked-posts.ts";
import { PublishingPublishedPosts } from "#analytics/infrastructure/publishing-published-posts.ts";
import { SqlAnalyticsReports } from "#analytics/infrastructure/sql-analytics-reports.ts";

/**
 * Reading a workspace's analytics (AnalyticsQueries), for the handlers, and
 * its records as a whole (AnalyticsRecords), for the workspace context's
 * exports and erasures, from Postgres. The composition root provides
 * `Drizzle` and `SqlClient`.
 */
export const AnalyticsLive = Layer.merge(
  AnalyticsQueries.layer.pipe(Layer.provide(SqlAnalyticsReports)),
  DrizzleAnalyticsRecords
);

/**
 * The collection (CollectMetrics), which follows the posts publishing
 * lists (PublishedTargets) and reads their counts with `readers`: through
 * the channels' gates on the server. Needs the database too.
 */
export const analyticsCollection = <E, R>(
  readers: Layer.Layer<MetricsReader, E, R>
) =>
  CollectMetrics.layer.pipe(
    Layer.provide(
      Layer.mergeAll(DrizzleTrackedPosts, PublishingPublishedPosts, readers)
    )
  );

// The analytics endpoints. They need the use cases AnalyticsLive provides,
// and the Authentication and WorkspaceAccess middleware of the workspace
// context, which the composition root brings.
export { AnalyticsHandlers as AnalyticsApiLive } from "#analytics/api/analytics.ts";

/** The hourly collection of posts' counts. Needs CollectMetrics. */
export { CollectMetricsCron as AnalyticsCronsLive } from "#analytics/infrastructure/crons.ts";

/**
 * The platforms' readers, Mastodon, Bluesky, TikTok, YouTube, Instagram and
 * Pinterest, which the channels' gates run. Need the channels context's ChannelAccess, and Dns.
 */
export { PlatformMetricsReaderLive } from "#analytics/infrastructure/platforms/platform-metrics-reader.ts";
