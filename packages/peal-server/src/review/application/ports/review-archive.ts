import { Context } from "effect";
import type { Effect } from "effect";

import type { ReviewCutoffs } from "#review/domain/review-retention.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** How many rows a retention run changed. */
export interface ReviewPurge {
  readonly emails: number;
  readonly names: number;
}

/**
 * What ends the review context's rows: a post deleted, a workspace erased,
 * an account closed, and the retention of what visitors gave.
 */
export class ReviewArchive extends Context.Service<
  ReviewArchive,
  {
    /**
     * Deletes a post's comments and approval requests. Its links stay, so
     * that whoever opens one is told the post was deleted, until they are
     * past their retention.
     */
    readonly deletePost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes everything the context keeps about a workspace. */
    readonly deleteWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Takes a user's id off what stays in other workspaces: their comments,
     * what they asked and decided, the links and settings they made.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    /**
     * Empties what is past its retention, `limit` rows of each at most, and
     * deletes the links that ended before names are kept.
     */
    readonly purge: (
      cutoffs: ReviewCutoffs,
      limit: number
    ) => Effect.Effect<ReviewPurge, DatabaseError>;
  }
>()("peal-server/review/application/ReviewArchive") {}
