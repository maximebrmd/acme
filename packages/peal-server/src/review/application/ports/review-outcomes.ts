import { Context, Effect, Layer } from "effect";
import type { DateTime, Option } from "effect";

import type { Reviewer } from "#review/domain/reviewer.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** What every outcome says of its post. */
interface AboutPost {
  /** The member who wrote the post, if a member did. */
  readonly authorId: Option.Option<UserId>;
  /** Names the outcome, so it is told once: ids and instants only. */
  readonly key: string;
  readonly postId: PostId;
  readonly workspaceId: WorkspaceId;
}

export interface ApprovalRequested extends AboutPost {
  /** The member who asked, if a member did. */
  readonly requestedBy: Option.Option<UserId>;
  readonly scheduledAt: DateTime.Utc;
}

export interface ApprovalDecided extends AboutPost {
  readonly by: Reviewer;
  readonly requestedBy: Option.Option<UserId>;
}

export interface PostApproved extends ApprovalDecided {
  /** Approved after its time: back to draft, for a new time. */
  readonly late: boolean;
}

export interface PostCommented extends AboutPost {
  readonly by: Reviewer;
  /** The members who wrote on the post before. */
  readonly participants: readonly UserId[];
}

/**
 * Tells the rest of Peal what happened in a review, in the transaction
 * that made it happen: an approval asked for, given or refused with
 * changes requested, and a comment. The members concerned hear through
 * the notices (`NotifiedReviewOutcomes`), and the workspace's webhook
 * endpoints through `webhookReviewOutcomes` (`post.approval_requested`,
 * `post.approved`, `post.changes_requested`). Another listener is told
 * here too, with nothing to change in the use cases.
 */
export class ReviewOutcomes extends Context.Service<
  ReviewOutcomes,
  {
    readonly approvalRequested: (
      outcome: ApprovalRequested
    ) => Effect.Effect<void, DatabaseError>;
    readonly approved: (
      outcome: PostApproved
    ) => Effect.Effect<void, DatabaseError>;
    readonly changesRequested: (
      outcome: ApprovalDecided
    ) => Effect.Effect<void, DatabaseError>;
    readonly commented: (
      outcome: PostCommented
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * A request no longer waits: whoever was asked to decide has nothing
     * left to do about it.
     */
    readonly settled: (
      requestKey: string
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/review/application/ReviewOutcomes") {
  /** Tells nobody, for tests that read the stores. */
  static readonly silent = Layer.succeed(
    ReviewOutcomes,
    ReviewOutcomes.of({
      approvalRequested: () => Effect.void,
      approved: () => Effect.void,
      changesRequested: () => Effect.void,
      commented: () => Effect.void,
      settled: () => Effect.void,
    })
  );
}
