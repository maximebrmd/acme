import { Layer } from "effect";

import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import { CollectAccounts } from "#analytics/application/collect-accounts.ts";
import { CollectMetrics } from "#analytics/application/collect-metrics.ts";
import type { MetricsReader } from "#analytics/application/metrics-reader.ts";
import { PurgeAnalytics } from "#analytics/application/purge-analytics.ts";
import { AccountPaceLive } from "#analytics/infrastructure/account-pace.ts";
import { PaidReadsLive } from "#analytics/infrastructure/billed-paid-reads.ts";
import { ChannelsConnectedChannels } from "#analytics/infrastructure/channels-connected-channels.ts";
import { CollectionPaceLive } from "#analytics/infrastructure/collection-pace.ts";
import {
  AnalyticsRetentionCron,
  CollectAccountsCron,
  CollectMetricsCron,
} from "#analytics/infrastructure/crons.ts";
import { DrizzleAnalyticsRecords } from "#analytics/infrastructure/drizzle-analytics-records.ts";
import { DrizzleTrackedPosts } from "#analytics/infrastructure/drizzle-tracked-posts.ts";
import { PlatformMetricsReaderLive as PlatformReaders } from "#analytics/infrastructure/platforms/platform-metrics-reader.ts";
import { PublishingPublishedPosts } from "#analytics/infrastructure/publishing-published-posts.ts";
import { SqlAnalyticsAcrossReads } from "#analytics/infrastructure/sql-analytics-across-reads.ts";
import { SqlAnalyticsReports } from "#analytics/infrastructure/sql-analytics-reports.ts";
import { SqlBestTimesReads } from "#analytics/infrastructure/sql-best-times-reads.ts";
import { SqlExpiredAnalytics } from "#analytics/infrastructure/sql-expired-analytics.ts";
import { SqlTrackedChannels } from "#analytics/infrastructure/sql-tracked-channels.ts";

/**
 * Reading a workspace's analytics (AnalyticsQueries), for the handlers,
 * its records as a whole (AnalyticsRecords), for the workspace context's
 * exports and erasures, and the retention job (PurgeAnalytics), from
 * Postgres. The composition root provides
 * `Drizzle` and `SqlClient`.
 */
export const AnalyticsLive = Layer.mergeAll(
  AnalyticsQueries.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        SqlAnalyticsReports,
        SqlAnalyticsAcrossReads,
        SqlBestTimesReads
      )
    )
  ),
  DrizzleAnalyticsRecords,
  PurgeAnalytics.layer.pipe(Layer.provide(SqlExpiredAnalytics))
);

/**
 * The collections: of posts (CollectMetrics), which follows the posts
 * publishing lists (PublishedTargets) and reads their counts, and of
 * accounts (CollectAccounts), which follows the channels the channels
 * context lists (ChannelDirectory) and reads each one's numbers once a
 * day. Both read with `readers`: through the channels' gates on the
 * server, so many channels at a time (`PEAL_ANALYTICS_CONCURRENCY`). Needs
 * the database too.
 */
export const analyticsCollection = <E, R>(
  readers: Layer.Layer<MetricsReader, E, R>
) =>
  Layer.merge(
    CollectMetrics.layer.pipe(Layer.provide(CollectionPaceLive)),
    CollectAccounts.layer.pipe(Layer.provide(AccountPaceLive))
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        DrizzleTrackedPosts,
        PublishingPublishedPosts,
        SqlTrackedChannels,
        ChannelsConnectedChannels,
        readers
      )
    )
  );

// The analytics endpoints. They need the use cases AnalyticsLive provides,
// and the Authentication and WorkspaceAccess middleware of the workspace
// context, which the composition root brings.
export { AnalyticsHandlers as AnalyticsApiLive } from "#analytics/api/analytics.ts";

/**
 * The hourly collections of posts' counts and of accounts' numbers, and
 * the daily retention job. Need CollectMetrics, CollectAccounts and
 * PurgeAnalytics.
 */
export const AnalyticsCronsLive = Layer.mergeAll(
  CollectMetricsCron,
  CollectAccountsCron,
  AnalyticsRetentionCron
);

/**
 * The platforms' readers, Mastodon, Bluesky, TikTok, YouTube, Instagram and
 * Pinterest, LinkedIn pages and, where the operator turned its reads on,
 * X, whose reads are counted against each workspace's allowance for the
 * day, or on a server that bills claimed on its billing account's `xApi`
 * meter for the workspaces that turned them on (PaidReads). The channels'
 * gates run them. Need the channels context's ChannelAccess, Dns, the
 * database, and billing's BillingMode, XPassThrough and MeteredUsage.
 */
export const PlatformMetricsReaderLive = PlatformReaders.pipe(
  Layer.provide(PaidReadsLive)
);

// A workspace's analytics as a whole, alone: for the channels context,
// which tells it of a channel gone or back in the transaction that deletes
// or saves the channel. Needs `Drizzle` and `SqlClient` only.
/**
 * The likes analytics last read of published targets (PostLikes), for
 * publishing's follow-up rules. Needs the database.
 */
export { SqlPostLikes as PostLikesLive } from "#analytics/infrastructure/sql-post-likes.ts";

export { DrizzleAnalyticsRecords as AnalyticsRecordsLive } from "#analytics/infrastructure/drizzle-analytics-records.ts";
