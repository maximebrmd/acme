import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  MediaAssetId,
  PostId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";

/** A post on one of its channels, as the channel will receive it. */
export interface ReviewedChannel {
  readonly channelId: ChannelId;
  /** The account's name on its platform; none once it was disconnected. */
  readonly handle: Option.Option<string>;
  readonly platform: Option.Option<Platform>;
  /** The text the post has there: its own, or the channel's. */
  readonly text: string;
}

/** An image or a video a post shows. */
export interface ReviewedMedia {
  readonly altText: string;
  readonly mediaId: MediaAssetId;
}

/**
 * Where a post is for its reviewers: still to go out (`draft`,
 * `awaitingApproval`, `scheduled`), or past reviewing (`published`, which
 * covers a post going out or gone out however it ended, and `cancelled`).
 */
export type ReviewedStatus =
  | "awaitingApproval"
  | "cancelled"
  | "draft"
  | "published"
  | "scheduled";

/** A post as its reviewers see it, and nothing else of its workspace. */
export interface ReviewedPost {
  readonly authorId: Option.Option<UserId>;
  readonly channels: readonly ReviewedChannel[];
  readonly media: readonly ReviewedMedia[];
  readonly postId: PostId;
  /** Its time, once it has one. */
  readonly schedule: Option.Option<{
    readonly at: DateTime.Utc;
    readonly timeZone: TimeZoneId;
  }>;
  readonly status: ReviewedStatus;
  readonly workspaceId: WorkspaceId;
}

/** What became of an approved post. */
export interface ReleasedPost {
  /** Approved after its time: it went back to draft, not out. */
  readonly late: boolean;
}

/**
 * The posts under review, from the publishing context, with their channels
 * named as the channels context has them, and what the review context's
 * decisions do to them. A post that waits no longer is `none` to `release`
 * and `sendBack`: someone took it back, or decided, meanwhile.
 */
export class ReviewedPosts extends Context.Service<
  ReviewedPosts,
  {
    /** The workspace's post; none when it was deleted. */
    readonly get: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<Option.Option<ReviewedPost>, DatabaseError>;
    /** Schedules an approved post, in the caller's transaction. */
    readonly release: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<Option.Option<ReleasedPost>, DatabaseError>;
    /** Takes a post that waits back to draft, in the caller's transaction. */
    readonly sendBack: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/review/application/ReviewedPosts") {}
