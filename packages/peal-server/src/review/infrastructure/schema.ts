import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// The review context's tables, in their own Postgres schema. Ids of other
// contexts (workspaces, posts, channels, users) have no foreign key: each
// context deletes its own rows. Instants are timestamptz written from the
// Clock (never NOW()), so tests control them.
export const reviewSchema = pgSchema("review");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * Which posts of a workspace wait for an approval (`approval_policy`), for
 * the workspaces that chose: the others have the default, never.
 */
export const settings = reviewSchema.table("settings", {
  approvalPolicy: text("approval_policy").notNull(),
  updatedAt: instant("updated_at").notNull(),
  // The member who chose; null when an API key did, or once they are gone.
  updatedBy: uuid("updated_by"),
  workspaceId: uuid("workspace_id").primaryKey(),
});

/**
 * Links to one post for people without an account. `token_hash` is the
 * SHA-256 of the link's token, which is never stored. `access`: view,
 * comment or approve.
 */
export const links = reviewSchema.table(
  "links",
  {
    access: text("access").notNull(),
    createdAt: instant("created_at").notNull(),
    createdBy: uuid("created_by"),
    expiresAt: instant("expires_at").notNull(),
    id: uuid("id").primaryKey(),
    postId: uuid("post_id").notNull(),
    revokedAt: instant("revoked_at"),
    tokenHash: text("token_hash").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    uniqueIndex("links_token_hash").on(table.tokenHash),
    index("links_post").on(table.postId),
    index("links_workspace").on(table.workspaceId),
  ]
);

/**
 * Comments on posts. `author_kind` is member, apiKey or visitor: a member
 * has `author_user_id` (null once they closed their account), a visitor the
 * link they came through, the name they gave (null once past its
 * retention), and the email they left to hear of replies, if any (emptied
 * 30 days after the link ended), with the language they read the page in.
 * `parent_id` is the comment that started the thread; that comment alone
 * carries the anchor (`anchor_*`: the channel, the words quoted and where
 * they started) and the resolution. `body` is plain text.
 */
export const comments = reviewSchema.table(
  "comments",
  {
    anchorChannelId: uuid("anchor_channel_id"),
    anchorQuote: text("anchor_quote"),
    anchorStart: integer("anchor_start"),
    authorKind: text("author_kind").notNull(),
    authorLinkId: uuid("author_link_id"),
    authorUserId: uuid("author_user_id"),
    body: text("body").notNull(),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    parentId: uuid("parent_id"),
    postId: uuid("post_id").notNull(),
    resolvedAt: instant("resolved_at"),
    resolvedByKind: text("resolved_by_kind"),
    resolvedByUserId: uuid("resolved_by_user_id"),
    visitorEmail: text("visitor_email"),
    visitorLocale: text("visitor_locale"),
    visitorName: text("visitor_name"),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // A post's comments, oldest first: ids are UUIDv7s.
    index("comments_post").on(table.postId, table.id),
    index("comments_workspace").on(table.workspaceId),
    index("comments_author").on(table.authorUserId),
    index("comments_link").on(table.authorLinkId),
  ]
);

/**
 * Each time someone asked for a post to go out where it needs an approval,
 * and what was decided: the record of who approved what. `subject_hash` is
 * the SHA-256 of what the post said then (never the text itself). `status`:
 * pending, approved, changesRequested or withdrawn. `decided_by_kind` is
 * member, apiKey or visitor, as for comments' authors, with the name a
 * visitor gave (null once past its retention) and the link they used.
 */
export const approvalRequests = reviewSchema.table(
  "approval_requests",
  {
    decidedAt: instant("decided_at"),
    decidedByKind: text("decided_by_kind"),
    decidedByLinkId: uuid("decided_by_link_id"),
    decidedByName: text("decided_by_name"),
    decidedByUserId: uuid("decided_by_user_id"),
    id: uuid("id").primaryKey(),
    postId: uuid("post_id").notNull(),
    requestedAt: instant("requested_at").notNull(),
    requestedBy: uuid("requested_by"),
    requestedVia: text("requested_via").notNull(),
    scheduleZone: text("schedule_zone").notNull(),
    scheduledAt: instant("scheduled_at").notNull(),
    status: text("status").notNull(),
    subjectHash: text("subject_hash").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // One request waits per post at most.
    uniqueIndex("approval_requests_pending")
      .on(table.postId)
      .where(sql`${table.status} = 'pending'`),
    index("approval_requests_post").on(table.postId, table.id),
    // A workspace's requests that wait, oldest first.
    index("approval_requests_workspace").on(
      table.workspaceId,
      table.status,
      table.id
    ),
  ]
);
