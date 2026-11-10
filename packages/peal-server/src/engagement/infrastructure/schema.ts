import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// The engagement context's tables, in their own Postgres schema. Instants
// are timestamptz written from the Clock, so tests control them. Comments
// hold what people who are not Peal's users wrote in public: they leave
// with their thread, 30 days after its collection ended, or with its
// workspace.
export const engagement = pgSchema("engagement");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * The comments under one post that went live on one channel: the
 * platform's id for the post, when it went live, when its comments are
 * read next (`next_collection_at`), or since when they are not
 * (`ended_at`, `end_reason`), and what its list shows: how many comments
 * the platform still shows, how many wait for an answer, and when the
 * latest was written. `author_id` is the member who wrote the post, null
 * for an API key's or once their account is closed. One thread per
 * published target.
 */
export const threads = engagement.table(
  "threads",
  {
    authorId: uuid("author_id"),
    channelId: uuid("channel_id").notNull(),
    commentCount: integer("comment_count").notNull().default(0),
    endReason: text("end_reason"),
    endedAt: instant("ended_at"),
    id: uuid("id").primaryKey(),
    lastCollectedAt: instant("last_collected_at"),
    lastCommentAt: instant("last_comment_at"),
    nextCollectionAt: instant("next_collection_at"),
    permalink: text("permalink"),
    platformPostId: text("platform_post_id").notNull(),
    postId: uuid("post_id").notNull(),
    publishedAt: instant("published_at").notNull(),
    targetId: uuid("target_id").notNull(),
    unansweredCount: integer("unanswered_count").notNull().default(0),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    uniqueIndex("threads_target").on(table.targetId),
    // The collection's two reads: the channels with threads due, then
    // those channels' due threads.
    index("threads_due")
      .on(table.nextCollectionAt, table.channelId)
      .where(sql`${table.nextCollectionAt} IS NOT NULL`),
    index("threads_channel_due")
      .on(table.channelId, table.nextCollectionAt, table.id)
      .where(sql`${table.nextCollectionAt} IS NOT NULL`),
    // A workspace's list: threads with comments, latest comment first.
    index("threads_workspace_listed")
      .on(table.workspaceId, table.lastCommentAt, table.id)
      .where(sql`${table.commentCount} > 0`),
    index("threads_post").on(table.postId),
    index("threads_author")
      .on(table.authorId)
      .where(sql`${table.authorId} IS NOT NULL`),
    index("threads_published").on(table.publishedAt, table.targetId),
    // The retention's read.
    index("threads_ended")
      .on(table.endedAt)
      .where(sql`${table.endedAt} IS NOT NULL`),
    check(
      "threads_collection",
      sql`(${table.nextCollectionAt} IS NULL) <> (${table.endedAt} IS NULL)`
    ),
  ]
);

/**
 * A comment as its platform gave it: its id there, the comment it answers
 * (null when it answers the post), its author's id, handle and display
 * name, its text, and where it stands for the workspace. A comment the
 * platform no longer shows (`deleted`) keeps neither text nor author.
 */
export const comments = engagement.table(
  "comments",
  {
    answeredAt: instant("answered_at"),
    authorDisplayName: text("author_display_name"),
    authorHandle: text("author_handle"),
    authorPlatformId: text("author_platform_id"),
    channelId: uuid("channel_id").notNull(),
    id: uuid("id").primaryKey(),
    liked: boolean("liked").notNull().default(false),
    parentPlatformId: text("parent_platform_id"),
    permalink: text("permalink"),
    platformCommentId: text("platform_comment_id").notNull(),
    receivedAt: instant("received_at").notNull(),
    state: text("state").notNull(),
    text: text("text").notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull(),
    writtenAt: instant("written_at").notNull(),
  },
  (table) => [
    uniqueIndex("comments_platform_id").on(
      table.threadId,
      table.platformCommentId
    ),
    index("comments_thread_written").on(table.threadId, table.writtenAt),
    check(
      "comments_state",
      sql`${table.state} IN ('new', 'answered', 'hidden', 'deleted')`
    ),
    check(
      "comments_deleted_forgotten",
      sql`${table.state} <> 'deleted' OR (${table.text} = '' AND ${table.authorPlatformId} IS NULL AND ${table.authorHandle} IS NULL AND ${table.authorDisplayName} IS NULL)`
    ),
  ]
);

/**
 * A reply sent from Peal as the channel's account, and the journal of its
 * sending: written `sending` before any call, `attempted_at` set and
 * committed before the request that can put it out, then how it ended.
 * `author_id` is the member who wrote it, null for an API key or once
 * their account is closed (no foreign key: Better Auth's table is another
 * context's).
 */
export const replies = engagement.table(
  "replies",
  {
    attemptedAt: instant("attempted_at"),
    authorId: uuid("author_id"),
    channelId: uuid("channel_id").notNull(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    permalink: text("permalink"),
    platformCommentId: text("platform_comment_id"),
    reason: text("reason"),
    settledAt: instant("settled_at"),
    status: text("status").notNull(),
    text: text("text").notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("replies_thread").on(table.threadId, table.id),
    index("replies_comment").on(table.commentId),
    // The replies no job settled, which the collection hands to a person.
    index("replies_sending")
      .on(table.createdAt, table.id)
      .where(sql`${table.status} = 'sending'`),
    index("replies_author")
      .on(table.authorId)
      .where(sql`${table.authorId} IS NOT NULL`),
    check(
      "replies_status",
      sql`${table.status} IN ('sending', 'sent', 'failed', 'unconfirmed', 'withdrawn')`
    ),
    check(
      "replies_settled",
      sql`(${table.status} = 'sending') = (${table.settledAt} IS NULL)`
    ),
  ]
);

/**
 * The workspaces whose threads were erased, by id, so a collection run
 * that listed their posts before the erasure follows none of them after
 * (`EngagementStore.follow`). Erasing and following take turns through an
 * advisory lock (`./following-lock.ts`). The ids name nothing that remains.
 */
export const erasedWorkspaces = engagement.table("erased_workspaces", {
  erasedAt: instant("erased_at").notNull(),
  workspaceId: uuid("workspace_id").primaryKey(),
});
