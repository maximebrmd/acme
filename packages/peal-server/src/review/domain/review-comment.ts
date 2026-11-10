import { Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { CommentAnchorSchema } from "./comment-anchor.ts";
import { CommentNotResolvable } from "./comment-not-resolvable.ts";
import { ReviewCommentIdSchema } from "./review-ids.ts";
import { ReviewerSchema } from "./reviewer.ts";
import type { Reviewer } from "./reviewer.ts";

/**
 * A comment on a post. A post's comments make threads: a comment that
 * answers none starts one, and may be about the post on one channel, or
 * some words of its text there (`anchor`); the others answer the comment
 * that started their thread (`parentId`). Whoever started a thread, or any
 * member, resolves it, and reopens it.
 *
 * `text` is plain text (`./plain-text.ts`): clients show it as text, never
 * as markup.
 */
export class ReviewComment extends Schema.Class<ReviewComment>(
  "peal-server/review/domain/ReviewComment"
)({
  anchor: Schema.Option(CommentAnchorSchema),
  author: ReviewerSchema,
  createdAt: Schema.DateTimeUtc,
  id: ReviewCommentIdSchema,
  // The comment that started the thread this one answers in.
  parentId: Schema.Option(ReviewCommentIdSchema),
  postId: PostIdSchema,
  resolution: Schema.Option(
    Schema.Struct({ at: Schema.DateTimeUtc, by: ReviewerSchema })
  ),
  text: Schema.NonEmptyString,
  workspaceId: WorkspaceIdSchema,
}) {}

/** Whether the comment started a thread. */
export const startsThread = (comment: ReviewComment): boolean =>
  Option.isNone(comment.parentId);

/**
 * Resolves the thread a comment started, or reopens it. Only the comment
 * that started a thread carries its resolution.
 */
export const setResolved = (
  comment: ReviewComment,
  resolved: boolean,
  by: Reviewer,
  now: DateTime.Utc
): Result.Result<ReviewComment, CommentNotResolvable> =>
  startsThread(comment)
    ? Result.succeed(
        new ReviewComment({
          anchor: comment.anchor,
          author: comment.author,
          createdAt: comment.createdAt,
          id: comment.id,
          parentId: comment.parentId,
          postId: comment.postId,
          resolution: resolved
            ? comment.resolution.pipe(
                Option.orElse(() => Option.some({ at: now, by }))
              )
            : Option.none(),
          text: comment.text,
          workspaceId: comment.workspaceId,
        })
      )
    : Result.fail(new CommentNotResolvable({ commentId: comment.id }));
