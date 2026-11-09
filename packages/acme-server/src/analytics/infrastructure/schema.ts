import { sql } from "drizzle-orm";
import {
  check,
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
 * (`ended_at`, `end_reason`). Quotes and impressions are null where the
 * platform does not give them.
 */
export const trackedPosts = analytics.table(
  "tracked_posts",
  {
    channelId: uuid("channel_id").notNull(),
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
    replies: integer("replies"),
    reposts: integer("reposts"),
    targetId: uuid("target_id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("tracked_posts_due")
      .on(table.nextCollectionAt, table.targetId)
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
    collectedAt: instant("collected_at").notNull(),
    impressions: integer("impressions"),
    likes: integer("likes").notNull(),
    quotes: integer("quotes"),
    replies: integer("replies").notNull(),
    reposts: integer("reposts").notNull(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => trackedPosts.targetId, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.targetId, table.collectedAt] }),
    check(
      "metric_snapshots_counts",
      sql`${table.likes} >= 0 AND ${table.reposts} >= 0 AND ${table.replies} >= 0 AND coalesce(${table.quotes}, 0) >= 0 AND coalesce(${table.impressions}, 0) >= 0`
    ),
  ]
);
