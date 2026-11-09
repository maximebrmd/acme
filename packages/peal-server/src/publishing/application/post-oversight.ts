import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { FailureReason } from "#publishing/domain/post-target-status.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { UnconfirmedReason } from "#shared/domain/publish-result.ts";

/** How many of a workspace's posts are in each status. */
export interface PostCounts {
  readonly cancelled: number;
  readonly draft: number;
  readonly finished: number;
  readonly publishing: number;
  readonly scheduled: number;
}

/**
 * A target that did not go out, or may have: ids, why and when. Never what
 * the post says.
 */
export type TargetTrouble =
  | {
      readonly at: DateTime.Utc;
      readonly channelId: ChannelId;
      readonly code: Option.Option<string>;
      readonly postId: PostId;
      readonly reason: FailureReason;
      readonly status: "failed";
      readonly targetId: PostTargetId;
    }
  | {
      readonly at: DateTime.Utc;
      readonly channelId: ChannelId;
      readonly postId: PostId;
      readonly reason: UnconfirmedReason;
      readonly status: "unconfirmed";
      readonly targetId: PostTargetId;
    };

/** A scheduled post: when, where, to how many channels. */
export interface DuePost {
  readonly channels: number;
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
  readonly workspaceId: WorkspaceId;
}

/**
 * What the staff console reads of publishing: counts, ids, times and
 * reasons, never a post's text or media. It checks no permission: only the
 * staff context calls it, for staff.
 */
export class PostOversight extends Context.Service<
  PostOversight,
  {
    readonly counts: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<PostCounts, DatabaseError>;
    /** The latest targets that failed or were left unconfirmed, newest first. */
    readonly troubles: (
      workspaceId: WorkspaceId,
      limit: number
    ) => Effect.Effect<readonly TargetTrouble[], DatabaseError>;
    /**
     * Posts scheduled from `from` (included) to `to` (excluded), soonest
     * first, in every workspace: the first `limit`, and how many in all.
     */
    readonly due: (range: {
      readonly from: DateTime.Utc;
      readonly limit: number;
      readonly to: DateTime.Utc;
    }) => Effect.Effect<
      { readonly posts: readonly DuePost[]; readonly total: number },
      DatabaseError
    >;
    /** How many posts are still scheduled for a time before `before`. */
    readonly overdue: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/publishing/application/PostOversight") {}
