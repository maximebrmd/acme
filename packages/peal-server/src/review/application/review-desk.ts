import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { ApprovalChanged } from "#review/domain/approval-changed.ts";
import { ApprovalNotPending } from "#review/domain/approval-not-pending.ts";
import {
  approve as approveRequest,
  asShown,
  requestChanges as refuseRequest,
  takesApplicationApproval,
} from "#review/domain/approval-request.ts";
import type {
  ApprovalRequest,
  ShownRequest,
} from "#review/domain/approval-request.ts";
import { quotes } from "#review/domain/comment-anchor.ts";
import type { CommentAnchor } from "#review/domain/comment-anchor.ts";
import { commentText, quotedText } from "#review/domain/plain-text.ts";
import {
  ReviewComment,
  setResolved,
  startsThread,
} from "#review/domain/review-comment.ts";
import { ReviewCommentIdSchema } from "#review/domain/review-ids.ts";
import type { ReviewCommentId } from "#review/domain/review-ids.ts";
import type { Reviewer } from "#review/domain/reviewer.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { requestKeyOf } from "./approval-intake.ts";
import { ApprovalNeedsPerson } from "./approval-needs-person.ts";
import { CommentNotFound } from "./comment-not-found.ts";
import { CommentRejected } from "./comment-rejected.ts";
import { ApprovalStore } from "./ports/approval-store.ts";
import { CommentStore } from "./ports/comment-store.ts";
import type { VisitorContact } from "./ports/comment-store.ts";
import { ReviewOutcomes } from "./ports/review-outcomes.ts";
import { ReviewedPosts } from "./ports/reviewed-posts.ts";
import type { ReviewedPost } from "./ports/reviewed-posts.ts";
import { VisitorMail } from "./ports/visitor-mail.ts";

/** A comment as it is sent, before it is checked. */
export interface CommentDraft {
  /** What it is about, for a comment that starts a thread. */
  readonly anchor: Option.Option<{
    readonly channelId: ChannelId;
    readonly selection: Option.Option<{
      readonly quote: string;
      readonly start: number;
    }>;
  }>;
  /** The comment it answers, if it answers one. */
  readonly parentId: Option.Option<ReviewCommentId>;
  readonly text: string;
}

const rejected = (problem: CommentRejected["problem"]) =>
  new CommentRejected({ problem });

// The anchor as it is kept, once it is about a channel of the post and
// quotes the text the post has there.
const anchorOn = (
  post: ReviewedPost,
  anchor: CommentDraft["anchor"]
): Effect.Effect<Option.Option<CommentAnchor>, CommentRejected> =>
  Effect.gen(function* checkAnchor() {
    if (Option.isNone(anchor)) {
      return Option.none();
    }

    const { channelId, selection } = anchor.value;
    const channel = post.channels.find((one) => one.channelId === channelId);

    if (channel === undefined) {
      return yield* rejected("anchor");
    }

    if (Option.isNone(selection)) {
      return Option.some({ channelId, selection: Option.none() });
    }

    const quote = quotedText(selection.value.quote);

    if (
      Option.isNone(quote) ||
      !quotes(
        { quote: quote.value, start: selection.value.start },
        channel.text
      )
    ) {
      return yield* rejected("selection");
    }

    return Option.some({
      channelId,
      selection: Option.some({
        quote: quote.value,
        start: selection.value.start,
      }),
    });
  });

/**
 * What reviewers do to a post, whoever they are: comment, resolve a thread,
 * approve, ask for changes. It checks what is said and that the post still
 * waits, never who says it: `PostReview` does for members, `VisitorReview`
 * for the holders of a link. Each change, what it does to the post and what
 * people are told of it commit together.
 */
export class ReviewDesk extends Context.Service<
  ReviewDesk,
  {
    readonly comment: (
      by: Reviewer,
      post: ReviewedPost,
      draft: CommentDraft,
      contact: Option.Option<VisitorContact>
    ) => Effect.Effect<ReviewComment, CommentRejected | DatabaseError>;
    readonly resolve: (
      by: Reviewer,
      post: ReviewedPost,
      commentId: ReviewCommentId,
      resolved: boolean
    ) => Effect.Effect<
      ReviewComment,
      CommentNotFound | CommentRejected | DatabaseError
    >;
    /**
     * Approves the post, which is then scheduled, or back to draft if
     * late. Through an application, only what a member asked for in person
     * (`takesApplicationApproval`). Both decisions are for the request
     * the reviewer was shown (`asShown`): another one, or the same for a
     * post that says something else, is ApprovalChanged.
     */
    readonly approve: (
      by: Reviewer,
      post: ReviewedPost,
      shown: ShownRequest,
      throughApplication: boolean
    ) => Effect.Effect<
      { readonly late: boolean; readonly request: ApprovalRequest },
      ApprovalChanged | ApprovalNeedsPerson | ApprovalNotPending | DatabaseError
    >;
    /** Sends the post back to draft, with a comment that says why. */
    readonly requestChanges: (
      by: Reviewer,
      post: ReviewedPost,
      shown: ShownRequest,
      text: string
    ) => Effect.Effect<
      { readonly comment: ReviewComment; readonly request: ApprovalRequest },
      ApprovalChanged | ApprovalNotPending | CommentRejected | DatabaseError
    >;
  }
>()("peal-server/review/application/ReviewDesk") {
  static readonly layer = Layer.effect(
    ReviewDesk,
    Effect.gen(function* ReviewDeskLive() {
      const comments = yield* CommentStore;
      const mail = yield* VisitorMail;
      const outcomes = yield* ReviewOutcomes;
      const posts = yield* ReviewedPosts;
      const requests = yield* ApprovalStore;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Effect.context<Ids>();

      // The comment as it is kept, in the caller's transaction.
      const write = Effect.fn("ReviewDesk.write")(function* write(
        by: Reviewer,
        post: ReviewedPost,
        draft: CommentDraft,
        contact: Option.Option<VisitorContact>,
        // Whether those who follow the post hear of the comment itself: not
        // when it says why changes are asked, which they hear of already.
        told: boolean
      ) {
        const text = yield* Option.match(commentText(draft.text), {
          onNone: () => Effect.fail(rejected("text")),
          onSome: Effect.succeed,
        });

        // An answer goes in a thread of this post, and is about what the
        // thread is about.
        if (Option.isSome(draft.parentId)) {
          const parent = yield* comments.get(
            post.workspaceId,
            draft.parentId.value
          );

          const inThread =
            Option.isSome(parent) &&
            parent.value.postId === post.postId &&
            startsThread(parent.value);

          if (!inThread) {
            return yield* rejected("parent");
          }

          if (Option.isSome(draft.anchor)) {
            return yield* rejected("anchor");
          }
        }

        const comment = new ReviewComment({
          anchor: yield* anchorOn(post, draft.anchor),
          author: by,
          createdAt: yield* DateTime.now,
          id: yield* newId(ReviewCommentIdSchema).pipe(
            Effect.provideContext(ids)
          ),
          parentId: draft.parentId,
          postId: post.postId,
          resolution: Option.none(),
          text,
          workspaceId: post.workspaceId,
        });

        const participants = yield* comments.membersOn(
          post.workspaceId,
          post.postId
        );

        yield* comments.insert(comment, contact);

        if (!told) {
          return comment;
        }

        yield* outcomes.commented({
          authorId: post.authorId,
          by,
          key: `review-comment:${comment.id}`,
          participants,
          postId: post.postId,
          workspaceId: post.workspaceId,
        });

        return comment;
      });

      // The visitors of the thread who asked to hear of answers.
      const tellListeners = (comment: ReviewComment) =>
        Option.match(comment.parentId, {
          onNone: () => Effect.void,
          onSome: (threadId) =>
            comments.listeners(threadId, comment.id).pipe(
              Effect.flatMap(mail.replied),
              // Telling them is not worth failing the answer for.
              Effect.catchTag("DatabaseError", (failure) =>
                Effect.logWarning(
                  "Could not list a thread's listeners",
                  failure
                )
              )
            ),
        });

      const comment = Effect.fn("ReviewDesk.comment")(function* comment(
        by: Reviewer,
        post: ReviewedPost,
        draft: CommentDraft,
        contact: Option.Option<VisitorContact>
      ) {
        const written = yield* transaction(
          write(by, post, draft, contact, true)
        );

        yield* tellListeners(written);

        return written;
      });

      const resolve = Effect.fn("ReviewDesk.resolve")(function* resolve(
        by: Reviewer,
        post: ReviewedPost,
        commentId: ReviewCommentId,
        resolved: boolean
      ) {
        const found = yield* comments.get(post.workspaceId, commentId);

        if (Option.isNone(found) || found.value.postId !== post.postId) {
          return yield* new CommentNotFound({ commentId });
        }

        const next = yield* Effect.fromResult(
          setResolved(found.value, resolved, by, yield* DateTime.now)
        ).pipe(
          Effect.catchTag("CommentNotResolvable", () =>
            Effect.fail(rejected("parent"))
          )
        );

        yield* comments.update(next);

        return next;
      });

      // The request that waits, when it is the one the reviewer was shown.
      const pendingFor = Effect.fn("ReviewDesk.pendingFor")(
        function* pendingFor(post: ReviewedPost, shown: ShownRequest) {
          const pending = yield* requests.lockPending(
            post.workspaceId,
            post.postId
          );

          if (Option.isNone(pending)) {
            return yield* new ApprovalNotPending({ postId: post.postId });
          }

          return yield* Effect.fromResult(asShown(pending.value, shown));
        }
      );

      const approve = Effect.fn("ReviewDesk.approve")(function* approve(
        by: Reviewer,
        post: ReviewedPost,
        shown: ShownRequest,
        throughApplication: boolean
      ) {
        return yield* transaction(
          Effect.gen(function* approveAndRelease() {
            const pending = yield* pendingFor(post, shown);

            if (throughApplication && !takesApplicationApproval(pending)) {
              return yield* new ApprovalNeedsPerson({ postId: post.postId });
            }

            const request = yield* Effect.fromResult(
              approveRequest(pending, by, yield* DateTime.now)
            );

            yield* requests.update(request);

            const released = yield* posts.release(
              post.workspaceId,
              post.postId
            );

            // The post stopped waiting meanwhile: nothing is approved.
            if (Option.isNone(released)) {
              return yield* new ApprovalNotPending({ postId: post.postId });
            }

            yield* outcomes.settled(requestKeyOf(request));

            yield* outcomes.approved({
              authorId: post.authorId,
              by,
              key: `approval-decision:${request.id}`,
              late: released.value.late,
              postId: post.postId,
              requestedBy: request.requestedBy,
              workspaceId: post.workspaceId,
            });

            return { late: released.value.late, request };
          })
        );
      });

      const requestChanges = Effect.fn("ReviewDesk.requestChanges")(
        function* requestChanges(
          by: Reviewer,
          post: ReviewedPost,
          shown: ShownRequest,
          text: string
        ) {
          return yield* transaction(
            Effect.gen(function* refuseAndSendBack() {
              const request = yield* Effect.fromResult(
                refuseRequest(
                  yield* pendingFor(post, shown),
                  by,
                  yield* DateTime.now
                )
              );

              yield* requests.update(request);

              const written = yield* write(
                by,
                post,
                {
                  anchor: Option.none(),
                  parentId: Option.none(),
                  text,
                },
                Option.none(),
                false
              );

              if (!(yield* posts.sendBack(post.workspaceId, post.postId))) {
                return yield* new ApprovalNotPending({ postId: post.postId });
              }

              yield* outcomes.settled(requestKeyOf(request));

              yield* outcomes.changesRequested({
                authorId: post.authorId,
                by,
                key: `approval-decision:${request.id}`,
                postId: post.postId,
                requestedBy: request.requestedBy,
                workspaceId: post.workspaceId,
              });

              return { comment: written, request };
            })
          );
        }
      );

      return ReviewDesk.of({ approve, comment, requestChanges, resolve });
    })
  );
}
