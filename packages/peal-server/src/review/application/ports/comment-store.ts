import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { ReviewComment } from "#review/domain/review-comment.ts";
import type { ReviewCommentId } from "#review/domain/review-ids.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

/** Where a visitor asked to hear of replies, and in which language. */
export interface VisitorContact {
  readonly email: string;
  readonly locale: Locale;
}

/** Comments on posts. */
export class CommentStore extends Context.Service<
  CommentStore,
  {
    /** Saves a comment, with where its visitor hears of replies, if asked. */
    readonly insert: (
      comment: ReviewComment,
      contact: Option.Option<VisitorContact>
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
    /**
     * The visitors of a thread who asked to hear of replies, each address
     * once, but for `except`, the comment just written.
     */
    readonly listeners: (
      threadId: ReviewCommentId,
      except: ReviewCommentId
    ) => Effect.Effect<readonly VisitorContact[], DatabaseError>;
    /** The members who wrote on the post: they follow it. */
    readonly membersOn: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly UserId[], DatabaseError>;
  }
>()("peal-server/review/application/CommentStore") {}
