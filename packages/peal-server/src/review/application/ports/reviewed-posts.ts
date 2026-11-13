import { Context } from "effect";
import type { DateTime, Effect, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  MediaAssetId,
  PostId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";

/** A channel's options as plain values, as the contract describes them. */
export type ShownOptions = Readonly<Record<string, Schema.Json>>;

/** An image or a video a post shows. */
export interface ReviewedMedia {
  readonly altText: string;
  readonly mediaId: MediaAssetId;
}

/** A part of a post after its first, on one channel. */
export interface ReviewedPart {
  readonly delaySeconds: number;
  readonly media: readonly ReviewedMedia[];
  readonly text: string;
}

/** A post on one of its channels, as the channel will receive it. */
export interface ReviewedChannel {
  readonly channelId: ChannelId;
  /**
   * The parts that follow the post there, in order, as the channel will
   * receive them: each with its text on the channel, its files, and the
   * seconds it waits after the part before it. An approval covers them.
   */
  readonly followUps: readonly ReviewedPart[];
  /** The account's name on its platform; none once it was disconnected. */
  readonly handle: Option.Option<string>;
  /**
   * The files the post shows there instead of its own, in order, when the
   * channel has some of its own; none when it shows the post's. An
   * approval covers them.
   */
  readonly media: Option.Option<readonly ReviewedMedia[]>;
  /**
   * What the post has there that only the channel's platform knows (a
   * Pin's link and board, a video's title and privacy), as plain values
   * tagged by `platform`; none where the platform takes none. An approval
   * covers them, so reviewers are shown them.
   */
  readonly options: Option.Option<ShownOptions>;
  readonly platform: Option.Option<Platform>;
  /** The text the post has there: its own, or the channel's. */
  readonly text: string;
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
    /**
     * Holds the post for the caller's transaction. A decision takes the
     * post before its request, as scheduling does, so an approval and a
     * move of the same post take turns.
     */
    readonly lock: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Schedules an approved post, in the caller's transaction. In a
     * workspace that holds more than its plan allows, nothing is scheduled
     * (PlanLimitReached): the caller's transaction is undone, and the post
     * keeps waiting.
     */
    readonly release: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<
      Option.Option<ReleasedPost>,
      DatabaseError | PlanLimitReached
    >;
    /** Takes a post that waits back to draft, in the caller's transaction. */
    readonly sendBack: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/review/application/ReviewedPosts") {}
