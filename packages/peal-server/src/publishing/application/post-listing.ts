import { Schema } from "effect";
import type { DateTime, Option } from "effect";

import type {
  PostOutcome,
  PostStatusName,
} from "#publishing/domain/post-status.ts";
import type { TagId } from "#publishing/domain/tag-id.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

import type { PostWithTargets } from "./post-repository.ts";

/**
 * How a list of posts is ordered: by creation, or by scheduled instant,
 * newest or oldest first. Posts without a time, as drafts, are left out of
 * a list ordered by scheduled instant.
 */
export const PostSortSchema = Schema.Literals([
  "createdDesc",
  "createdAsc",
  "scheduledDesc",
  "scheduledAsc",
]);

export type PostSort = typeof PostSortSchema.Type;

/** How a post's creator reached Peal (`PostOrigin`'s tags). */
export type PostOriginVia = "apiKey" | "application" | "web";

/** Which of a workspace's posts to list: every condition given holds. */
export interface PostFilter {
  readonly authorId: Option.Option<UserId>;
  /**
   * Posts with a target on one of these channels at least; an empty list
   * matches no post.
   */
  readonly channelIds: Option.Option<readonly ChannelId[]>;
  readonly createdVia: Option.Option<PostOriginVia>;
  readonly outcome: Option.Option<PostOutcome>;
  /** Scheduled before this instant, excluded. */
  readonly scheduledBefore: Option.Option<DateTime.Utc>;
  /** Scheduled from this instant, included. */
  readonly scheduledFrom: Option.Option<DateTime.Utc>;
  readonly status: Option.Option<PostStatusName>;
  /**
   * Posts filed under one of these tags at least; an empty list matches
   * no post.
   */
  readonly tagIds: Option.Option<readonly TagId[]>;
}

/**
 * Where a page ended: its last post, and the instant that post is
 * scheduled at when the list is ordered by it. Ids are UUIDv7s, so the id
 * alone orders posts by creation, and breaks ties between posts scheduled
 * at the same instant: a page never repeats nor skips a post, whatever is
 * created or moved meanwhile.
 */
export const PostPositionSchema = Schema.Struct({
  postId: PostIdSchema,
  scheduledAt: Schema.NullOr(Schema.DateTimeUtcFromMillis),
  sort: PostSortSchema,
});

export type PostPosition = typeof PostPositionSchema.Type;

/** A page of a workspace's posts to read. */
export interface PostPageRequest {
  /** The position the page before ended at, if this is not the first. */
  readonly after: Option.Option<PostPosition>;
  readonly filter: PostFilter;
  readonly limit: number;
  readonly sort: PostSort;
  readonly workspaceId: WorkspaceId;
}

/** A page of posts, in the order asked. */
export interface StoredPostPage {
  readonly items: readonly PostWithTargets[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<PostPosition>;
}
