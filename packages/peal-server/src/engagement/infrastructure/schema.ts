import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgSchema,
  smallint,
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
 * (`ended_at`, `end_reason`), when they must be read again or be
 * forgotten (`refresh_by`, on a platform that bounds how long Peal keeps
 * what it gave without reading it again; null elsewhere), and what its
 * list shows: how many comments the platform still shows, how many wait
 * for an answer, and when the latest was written. `author_id` is the member who wrote the post, null
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
    refreshBy: instant("refresh_by"),
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
    // The threads whose comments must be forgotten: few, on the platforms
    // that bound how long comments are kept.
    index("threads_refresh_by")
      .on(table.refreshBy)
      .where(sql`${table.refreshBy} IS NOT NULL`),
    // A channel gone forgets its bounded threads' comments at once.
    index("threads_channel_refresh")
      .on(table.channelId)
      .where(sql`${table.refreshBy} IS NOT NULL`),
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
 * platform no longer shows (`deleted`) keeps neither text nor author;
 * `expired_at` says when one was forgotten because its platform bounds
 * how long a comment is kept without being read again, null otherwise.
 */
export const comments = engagement.table(
  "comments",
  {
    answeredAt: instant("answered_at"),
    authorDisplayName: text("author_display_name"),
    authorHandle: text("author_handle"),
    authorPlatformId: text("author_platform_id"),
    channelId: uuid("channel_id").notNull(),
    expiredAt: instant("expired_at"),
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
 * Rows are inserted once and then only moved from the status they were
 * read in (`EngagementStore.advanceReply`).
 * `author_id` is the member who wrote it, null for an API key or once
 * their account is closed (no foreign key: Better Auth's table is another
 * context's).
 */
export const replies = engagement.table(
  "replies",
  {
    attemptedAt: instant("attempted_at"),
    authorId: uuid("author_id"),
    // When a gate last claimed the reply for a call to its platform: a
    // call that may still be making keeps the reply from being handed over.
    callClaimedAt: instant("call_claimed_at"),
    channelId: uuid("channel_id").notNull(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    // The SHA-256 of the idempotency key the request came with, never the
    // key; null without one, and once the key is forgotten.
    keyDigest: text("key_digest"),
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
    // One reply to a comment is on its way or unconfirmed at a time: two
    // requests sent together journal one, whatever each read before.
    uniqueIndex("replies_pending_comment")
      .on(table.commentId)
      .where(sql`${table.status} IN ('sending', 'unconfirmed')`),
    // One reply an idempotency key, in its workspace.
    uniqueIndex("replies_key")
      .on(table.workspaceId, table.keyDigest)
      .where(sql`${table.keyDigest} IS NOT NULL`),
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

/**
 * The reviews of one location, the account a Google Business Profile
 * channel posts as: one thread a channel, read when `next_read_at` comes,
 * and what the platform says of the location (`average_rating`,
 * `total_review_count`), with what its list shows: how many reviews Peal
 * keeps, how many wait for an answer, and when the latest was written or
 * changed. It goes with its channel, its workspace, or once it was not
 * read for as long as Google lets Peal keep what it gives.
 */
export const reviewThreads = engagement.table(
  "review_threads",
  {
    averageRating: doublePrecision("average_rating"),
    channelId: uuid("channel_id").notNull(),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    lastReadAt: instant("last_read_at"),
    lastReviewAt: instant("last_review_at"),
    nextReadAt: instant("next_read_at").notNull(),
    reviewCount: integer("review_count").notNull().default(0),
    totalReviewCount: integer("total_review_count"),
    unansweredCount: integer("unanswered_count").notNull().default(0),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    uniqueIndex("review_threads_channel").on(table.channelId),
    index("review_threads_due").on(table.nextReadAt, table.id),
    // A workspace's list: locations with reviews, latest first.
    index("review_threads_workspace_listed")
      .on(table.workspaceId, table.lastReviewAt, table.id)
      .where(sql`${table.reviewCount} > 0`),
    // The retention's read: threads no read reached in time.
    index("review_threads_read").on(table.lastReadAt),
  ]
);

/**
 * A review someone left on a location, as Google gave it: its name there
 * (`platform_review_id`), its stars, its text, the name its author shows
 * (null when they stay anonymous), how many photos it holds (never the
 * photos), when it was written and last changed, and the location's reply
 * as Google shows it. `answered_at` is when a member said it needs no
 * answer. Kept 29 days from `updated_at` at most (Google's policies let
 * what its API gives be stored 30 days).
 */
export const reviews = engagement.table(
  "reviews",
  {
    answeredAt: instant("answered_at"),
    channelId: uuid("channel_id").notNull(),
    id: uuid("id").primaryKey(),
    photoCount: integer("photo_count").notNull().default(0),
    platformReviewId: text("platform_review_id").notNull(),
    rating: smallint("rating").notNull(),
    receivedAt: instant("received_at").notNull(),
    replyModeration: text("reply_moderation"),
    replyText: text("reply_text"),
    replyUpdatedAt: instant("reply_updated_at"),
    reviewerName: text("reviewer_name"),
    text: text("text").notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => reviewThreads.id, { onDelete: "cascade" }),
    updatedAt: instant("updated_at").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    writtenAt: instant("written_at").notNull(),
  },
  (table) => [
    uniqueIndex("reviews_platform_id").on(
      table.threadId,
      table.platformReviewId
    ),
    index("reviews_thread_updated").on(table.threadId, table.updatedAt),
    // The retention's read.
    index("reviews_updated").on(table.updatedAt),
    check("reviews_rating", sql`${table.rating} BETWEEN 1 AND 5`),
    check("reviews_photos", sql`${table.photoCount} >= 0`),
    check(
      "reviews_reply",
      sql`(${table.replyText} IS NULL) = (${table.replyUpdatedAt} IS NULL)`
    ),
    check(
      "reviews_reply_moderation",
      sql`${table.replyModeration} IS NULL OR (${table.replyText} IS NOT NULL AND ${table.replyModeration} IN ('pending', 'approved', 'rejected'))`
    ),
  ]
);

/**
 * A reply sent from Peal to a review, as the location, and the journal of
 * its sending, as `replies` is for comments: written `sending` before any
 * call, `attempted_at` set and committed before the request that can put
 * it out, then how it ended. A review holds one reply on Google, which a
 * new one replaces; an `unconfirmed` reply is settled by the next read of
 * its location. `author_id` is the member who wrote it, null for an API
 * key or once their account is closed. It goes with its review.
 */
export const reviewReplies = engagement.table(
  "review_replies",
  {
    attemptedAt: instant("attempted_at"),
    authorId: uuid("author_id"),
    callClaimedAt: instant("call_claimed_at"),
    channelId: uuid("channel_id").notNull(),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    // The SHA-256 of the idempotency key the request came with, never the
    // key; null without one, and once the key is forgotten.
    keyDigest: text("key_digest"),
    reason: text("reason"),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    settledAt: instant("settled_at"),
    status: text("status").notNull(),
    text: text("text").notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => reviewThreads.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("review_replies_thread").on(table.threadId, table.id),
    index("review_replies_review").on(table.reviewId, table.id),
    // One reply to a review is on its way or unconfirmed at a time.
    uniqueIndex("review_replies_pending")
      .on(table.reviewId)
      .where(sql`${table.status} IN ('sending', 'unconfirmed')`),
    // One reply an idempotency key, in its workspace.
    uniqueIndex("review_replies_key")
      .on(table.workspaceId, table.keyDigest)
      .where(sql`${table.keyDigest} IS NOT NULL`),
    // The replies no job settled, which the collection settles.
    index("review_replies_sending")
      .on(table.createdAt, table.id)
      .where(sql`${table.status} = 'sending'`),
    index("review_replies_author")
      .on(table.authorId)
      .where(sql`${table.authorId} IS NOT NULL`),
    check(
      "review_replies_status",
      sql`${table.status} IN ('sending', 'sent', 'failed', 'unconfirmed', 'withdrawn')`
    ),
    check(
      "review_replies_settled",
      sql`(${table.status} = 'sending') = (${table.settledAt} IS NULL)`
    ),
  ]
);
