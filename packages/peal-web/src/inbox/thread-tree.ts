import { Option } from "effect";
import type { InboxComment, InboxReply } from "peal-contract";

// How a thread's page lays out what the API lists flat: comments nested one
// level, and each comment's replies under it.

/** A comment that answers the post, with the comments under it. */
export interface CommentBranch {
  /** The comments that answer it, or one another under it, oldest first. */
  readonly answers: readonly InboxComment[];
  readonly comment: InboxComment;
}

/**
 * The thread's comments nested one level, in the order given (oldest
 * first). A comment goes under the one it answers; one that answers an
 * answer goes under the same comment, after it. A comment whose parent the
 * thread does not hold stands on its own.
 */
export const nestComments = (
  comments: readonly InboxComment[]
): readonly CommentBranch[] => {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));

  const parentOf = (comment: InboxComment): Option.Option<InboxComment> =>
    Option.fromNullOr(comment.parentId).pipe(
      Option.flatMapNullishOr((parentId) => byId.get(parentId))
    );

  // The comment a comment hangs under: none when it stands on its own, or
  // when its parents lead back to it, which no platform should say.
  const rootOf = (
    comment: InboxComment,
    seen: ReadonlySet<string>
  ): Option.Option<InboxComment> =>
    parentOf(comment).pipe(
      Option.flatMap((parent) => {
        if (seen.has(parent.id)) {
          return Option.none();
        }

        return Option.isNone(parentOf(parent))
          ? Option.some(parent)
          : rootOf(parent, new Set([...seen, parent.id]));
      })
    );

  const placed = comments.map((comment) => ({
    comment,
    root: rootOf(comment, new Set([comment.id])).pipe(
      Option.map(({ id }) => id),
      Option.getOrNull
    ),
  }));

  const answersTo = (commentId: string) =>
    placed.flatMap(({ comment, root }) =>
      root === commentId ? [comment] : []
    );

  return placed.flatMap(({ comment, root }) =>
    root === null ? [{ answers: answersTo(comment.id), comment }] : []
  );
};

/**
 * The thread's replies with those just sent from this page that it does
 * not list yet: the thread's own say how each one stands.
 */
export const withSentReplies = (
  listed: readonly InboxReply[],
  sent: readonly InboxReply[]
): readonly InboxReply[] => {
  const known = new Set(listed.map(({ id }) => id));

  return [...listed, ...sent.filter(({ id }) => !known.has(id))];
};

/** The replies sent to one comment, oldest first. */
export const repliesTo = (
  replies: readonly InboxReply[],
  commentId: string
): readonly InboxReply[] =>
  replies.filter((reply) => reply.commentId === commentId);

/**
 * Whether a reply to the comment is on its way or may have gone out: the
 * API refuses another until it is settled.
 */
export const pendingReplyTo = (
  replies: readonly InboxReply[],
  commentId: string
): Option.Option<InboxReply> =>
  Option.fromUndefinedOr(
    repliesTo(replies, commentId).find(
      ({ status }) => status === "sending" || status === "unconfirmed"
    )
  );

/** Whether any reply is on its way, so the page keeps asking how it ended. */
export const anySending = (replies: readonly InboxReply[]): boolean =>
  replies.some(({ status }) => status === "sending");
