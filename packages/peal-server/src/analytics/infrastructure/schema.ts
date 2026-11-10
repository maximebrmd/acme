import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// The analytics context's tables, in their own Postgres schema. Instants are
// timestamptz written from the Clock, so tests control them. Rows hold ids
// and counts, never what a post says.
export const analytics = pgSchema("analytics");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * A post that went live on a channel, which analytics reads back: the
 * platform's id for it, when it went live, the counts read last, and when
 * it is read next (`next_collection_at`), or since when it is not
 * (`ended_at`, `end_reason`). Quotes, impressions, clicks, reach and saves
 * are null where the platform does not give them.
 */
export const trackedPosts = analytics.table(
  "tracked_posts",
  {
    channelId: uuid("channel_id").notNull(),
    clicks: integer("clicks"),
    endReason: text("end_reason"),
    endedAt: instant("ended_at"),
    impressions: integer("impressions"),
    lastCollectedAt: instant("last_collected_at"),
    likes: integer("likes"),
    nextCollectionAt: instant("next_collection_at"),
    permalink: text("permalink"),
    platformPostId: text("platform_post_id").notNull(),
    postId: uuid("post_id").notNull(),
    publishedAt: instant("published_at").notNull(),
    quotes: integer("quotes"),
    reach: integer("reach"),
    replies: integer("replies"),
    reposts: integer("reposts"),
    saves: integer("saves"),
    targetId: uuid("target_id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // The collection's two reads: the channels with posts due, from the
    // first index alone, then those channels' due posts, from the second.
    index("tracked_posts_due")
      .on(table.nextCollectionAt, table.channelId)
      .where(sql`${table.nextCollectionAt} IS NOT NULL`),
    index("tracked_posts_channel_due")
      .on(table.channelId, table.nextCollectionAt, table.targetId)
      .where(sql`${table.nextCollectionAt} IS NOT NULL`),
    index("tracked_posts_workspace_published").on(
      table.workspaceId,
      table.publishedAt
    ),
    index("tracked_posts_post").on(table.postId),
    index("tracked_posts_published").on(table.publishedAt, table.targetId),
    check(
      "tracked_posts_collection",
      sql`(${table.nextCollectionAt} IS NULL) <> (${table.endedAt} IS NULL)`
    ),
  ]
);

/** A post's counts as read at one moment: what charts draw over time. */
export const metricSnapshots = analytics.table(
  "metric_snapshots",
  {
    clicks: integer("clicks"),
    collectedAt: instant("collected_at").notNull(),
    impressions: integer("impressions"),
    likes: integer("likes").notNull(),
    quotes: integer("quotes"),
    reach: integer("reach"),
    replies: integer("replies").notNull(),
    reposts: integer("reposts").notNull(),
    saves: integer("saves"),
    targetId: uuid("target_id")
      .notNull()
      .references(() => trackedPosts.targetId, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.targetId, table.collectedAt] }),
    check(
      "metric_snapshots_counts",
      sql`${table.likes} >= 0 AND ${table.reposts} >= 0 AND ${table.replies} >= 0 AND coalesce(${table.quotes}, 0) >= 0 AND coalesce(${table.impressions}, 0) >= 0 AND coalesce(${table.clicks}, 0) >= 0 AND coalesce(${table.reach}, 0) >= 0 AND coalesce(${table.saves}, 0) >= 0`
    ),
  ]
);

/**
 * The workspaces whose analytics were erased, by id, so a collection run
 * that listed their posts before the erasure follows none of them after
 * (`TrackedPosts.track`). Erasing and following take turns through an
 * advisory lock (`./tracking-lock.ts`). The ids name nothing that remains.
 */
export const erasedWorkspaces = analytics.table("erased_workspaces", {
  erasedAt: instant("erased_at").notNull(),
  workspaceId: uuid("workspace_id").primaryKey(),
});

/**
 * What a workspace read on a platform that bills the server's app for each
 * resource a read returns (X), by UTC day: the platform's id of each post
 * or account read, once a day, as the platform bills it. The rows of a day
 * are what the workspace's allowance for it is counted from; the retention
 * job deletes them once they are 35 days old.
 */
export const paidReads = analytics.table(
  "paid_reads",
  {
    day: date("day").notNull(),
    platform: text("platform").notNull(),
    resource: text("resource").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.workspaceId, table.platform, table.day, table.resource],
    }),
    index("paid_reads_day").on(table.day),
  ]
);

/**
 * A connected channel whose account analytics reads once a day: when next
 * (`next_collection_at`), and when it was read last. The platform is kept
 * with it, as how long a platform's numbers may be kept depends on it.
 */
export const trackedChannels = analytics.table(
  "tracked_channels",
  {
    channelId: uuid("channel_id").primaryKey(),
    lastCollectedAt: instant("last_collected_at"),
    nextCollectionAt: instant("next_collection_at").notNull(),
    platform: text("platform").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("tracked_channels_due").on(table.nextCollectionAt, table.channelId),
    index("tracked_channels_workspace").on(table.workspaceId),
  ]
);

/**
 * An account's numbers for one UTC day: its followers, the accounts it
 * follows and its posts as read that day (the day's last read), and the
 * views and reach its platform counted for the day, which a later read may
 * revise. Each is null where the platform gives none: never zero.
 */
export const accountSnapshots = analytics.table(
  "account_snapshots",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => trackedChannels.channelId, { onDelete: "cascade" }),
    collectedAt: instant("collected_at").notNull(),
    day: date("day").notNull(),
    followers: integer("followers"),
    following: integer("following"),
    posts: integer("posts"),
    reach: integer("reach"),
    views: integer("views"),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.day] }),
    check(
      "account_snapshots_counts",
      sql`coalesce(${table.followers}, 0) >= 0 AND coalesce(${table.following}, 0) >= 0 AND coalesce(${table.posts}, 0) >= 0 AND coalesce(${table.reach}, 0) >= 0 AND coalesce(${table.views}, 0) >= 0`
    ),
  ]
);
