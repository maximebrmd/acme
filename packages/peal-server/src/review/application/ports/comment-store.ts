import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { ReviewComment } from "#review/domain/review-comment.ts";
import type { ReviewCommentId } from "#review/domain/review-ids.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** Comments on posts. */
export class CommentStore extends Context.Service<
  CommentStore,
  {
    readonly insert: (
      comment: ReviewComment
    ) => Effect.Effect<void, DatabaseError>;
    readonly get: (
      workspaceId: WorkspaceId,
      commentId: ReviewCommentId
    ) => Effect.Effect<Option.Option<ReviewComment>, DatabaseError>;
    /** The post's comments, oldest first. */
    readonly ofPost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly ReviewComment[], DatabaseError>;
    /** Saves a thread's resolution. */
    readonly update: (
      comment: ReviewComment
    ) => Effect.Effect<void, DatabaseError>;
    /** The members who wrote on the post: they follow it. */
    readonly membersOn: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly UserId[], DatabaseError>;
  }
>()("peal-server/review/application/CommentStore") {}
