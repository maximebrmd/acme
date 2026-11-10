import { Context, Effect, Layer, Option } from "effect";

import type { ApprovalChanged } from "#review/domain/approval-changed.ts";
import type { ApprovalNotPending } from "#review/domain/approval-not-pending.ts";
import {
  isApplication,
  isImpersonated,
} from "#review/domain/approval-policy.ts";
import type {
  ApprovalRequest,
  ShownRequest,
} from "#review/domain/approval-request.ts";
import type { ReviewComment } from "#review/domain/review-comment.ts";
import type { ReviewCommentId } from "#review/domain/review-ids.ts";
import { reviewerOf } from "#review/domain/reviewer.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId, UserId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

import type { ApprovalNeedsPerson } from "./approval-needs-person.ts";
import type { CommentNotFound } from "./comment-not-found.ts";
import type { CommentRejected } from "./comment-rejected.ts";
import { ApprovalStore } from "./ports/approval-store.ts";
import { CommentStore } from "./ports/comment-store.ts";
import { MediaPreviews } from "./ports/media-previews.ts";
import { MemberNames } from "./ports/member-names.ts";
import { ReviewedPosts } from "./ports/reviewed-posts.ts";
import type { ReviewedPost } from "./ports/reviewed-posts.ts";
import { ReviewDesk } from "./review-desk.ts";
import type { CommentDraft } from "./review-desk.ts";
import { ReviewPostNotFound } from "./review-post-not-found.ts";
import { noMedia, shownMedia } from "./shown-media.ts";
import type { ShownMedia } from "./shown-media.ts";

/** The most requests that wait listed at once. */
export const maxPendingListed = 100;

/**
 * A post's review: its comments, what was asked and decided, and the post
 * as its channels will receive it, which is what the request that waits is
 * for.
 */
export interface PostThread {
  readonly comments: readonly ReviewComment[];
  /** The files the post shows; none for a member who may not read media. */
  readonly previews: ShownMedia;
  /** The names of the members who wrote or decided. */
  readonly names: ReadonlyMap<UserId, string>;
  readonly post: ReviewedPost;
  /** Newest first. */
  readonly requests: readonly ApprovalRequest[];
}

/** A request that waits, with the names of the members it mentions. */
export interface PendingApprovals {
  readonly names: ReadonlyMap<UserId, string>;
  readonly requests: readonly ApprovalRequest[];
}

type Refused = DatabaseError | MissingPermission | ReviewPostNotFound;

/** The members a post's review mentions, to name them. */
export const membersIn = (
  comments: readonly ReviewComment[],
  requests: readonly ApprovalRequest[]
): readonly UserId[] => {
  const reviewers = [
    ...comments.map(({ author }) => author),
    ...comments.flatMap(({ resolution }) =>
      Option.toArray(resolution).map(({ by }) => by)
    ),
    ...requests.flatMap(({ decision }) =>
      Option.toArray(decision).map(({ by }) => by)
    ),
  ];

  return [
    ...new Set([
      ...reviewers.flatMap((reviewer) =>
        reviewer._tag === "member" ? Option.toArray(reviewer.userId) : []
      ),
      ...requests.flatMap(({ requestedBy }) => Option.toArray(requestedBy)),
    ]),
  ];
};

const mayComment = (actor: Actor) =>
  can(actor, "post:create") || can(actor, "post:approve")
    ? Effect.succeed(actor)
    : Effect.fail(new MissingPermission({ permission: "post:create" }));

const mayDecide = (actor: Actor) =>
  isImpersonated(actor)
    ? Effect.fail(new MissingPermission({ permission: "post:approve" }))
    : Effect.fromResult(authorize(actor, "post:approve"));

/**
 * A post's review in the app, for the workspace's members and its
 * applications:
 *
 * - reading it, and the requests that wait, needs post:read;
 * - commenting, answering and resolving a thread need post:create or
 *   post:approve (owners, admins, editors and contributors; not viewers,
 *   nor applications let to read only);
 * - approving and asking for changes need post:approve, in person or
 *   through an application, never as staff acting as a member: an approved
 *   post goes out once they are gone. An application approves only what a
 *   member asked for in person: what an application asked for waits for a
 *   person (ApprovalNeedsPerson).
 *
 * A decision names the request its reviewer was shown and what the post
 * said then (`ShownRequest`): a post asked again or changed since is
 * ApprovalChanged, and they look again.
 *
 * Whoever may approve may approve a post they wrote or asked to send: an
 * approval says that someone allowed to has looked, not that two people
 * have.
 */
export class PostReview extends Context.Service<
  PostReview,
  {
    readonly thread: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<PostThread, Refused>;
    readonly pending: (
      actor: Actor
    ) => Effect.Effect<PendingApprovals, DatabaseError | MissingPermission>;
    readonly comment: (
      actor: Actor,
      postId: PostId,
      draft: CommentDraft
    ) => Effect.Effect<ReviewComment, CommentRejected | Refused>;
    readonly resolve: (
      actor: Actor,
      postId: PostId,
      commentId: ReviewCommentId,
      resolved: boolean
    ) => Effect.Effect<
      ReviewComment,
      CommentNotFound | CommentRejected | Refused
    >;
    readonly approve: (
      actor: Actor,
      postId: PostId,
      shown: ShownRequest
    ) => Effect.Effect<
      { readonly late: boolean; readonly request: ApprovalRequest },
      ApprovalChanged | ApprovalNeedsPerson | ApprovalNotPending | Refused
    >;
    readonly requestChanges: (
      actor: Actor,
      postId: PostId,
      shown: ShownRequest,
      text: string
    ) => Effect.Effect<
      { readonly comment: ReviewComment; readonly request: ApprovalRequest },
      ApprovalChanged | ApprovalNotPending | CommentRejected | Refused
    >;
  }
>()("peal-server/review/application/PostReview") {
  static readonly layer = Layer.effect(
    PostReview,
    Effect.gen(function* PostReviewLive() {
      const comments = yield* CommentStore;
      const desk = yield* ReviewDesk;
      const names = yield* MemberNames;
      const posts = yield* ReviewedPosts;
      const previews = yield* MediaPreviews;
      const requests = yield* ApprovalStore;

      const postOf = Effect.fn("PostReview.postOf")(function* postOf(
        actor: Actor,
        postId: PostId
      ) {
        const found = yield* posts.get(actor.workspaceId, postId);

        return yield* Option.match(found, {
          onNone: () => Effect.fail(new ReviewPostNotFound({ postId })),
          onSome: Effect.succeed,
        });
      });

      const thread = Effect.fn("PostReview.thread")(function* thread(
        actor: Actor,
        postId: PostId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        yield* postOf(actor, postId);

        const written = yield* comments.ofPost(actor.workspaceId, postId);

        // The post shown is never older than the request it is shown
        // with: the requests are read first, so a decision for this
        // answer's request is one for this answer's post, or is refused
        // (ApprovalChanged).
        const asked = yield* requests.ofPost(actor.workspaceId, postId);
        const post = yield* postOf(actor, postId);

        return {
          comments: written,
          names: yield* names.of(membersIn(written, asked)),
          post,
          previews: can(actor, "media:read")
            ? yield* shownMedia(previews, post)
            : noMedia,
          requests: asked,
        };
      });

      const pending = Effect.fn("PostReview.pending")(function* pending(
        actor: Actor
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const waiting = yield* requests.pending(
          actor.workspaceId,
          maxPendingListed
        );

        return {
          names: yield* names.of(membersIn([], waiting)),
          requests: waiting,
        };
      });

      const comment = Effect.fn("PostReview.comment")(function* comment(
        actor: Actor,
        postId: PostId,
        draft: CommentDraft
      ) {
        yield* mayComment(actor);

        return yield* desk.comment(
          reviewerOf(actor),
          yield* postOf(actor, postId),
          draft,
          Option.none()
        );
      });

      const resolve = Effect.fn("PostReview.resolve")(function* resolve(
        actor: Actor,
        postId: PostId,
        commentId: ReviewCommentId,
        resolved: boolean
      ) {
        yield* mayComment(actor);

        return yield* desk.resolve(
          reviewerOf(actor),
          yield* postOf(actor, postId),
          commentId,
          resolved
        );
      });

      const approve = Effect.fn("PostReview.approve")(function* approve(
        actor: Actor,
        postId: PostId,
        shown: ShownRequest
      ) {
        yield* mayDecide(actor);

        return yield* desk.approve(
          reviewerOf(actor),
          yield* postOf(actor, postId),
          shown,
          isApplication(actor)
        );
      });

      const requestChanges = Effect.fn("PostReview.requestChanges")(
        function* requestChanges(
          actor: Actor,
          postId: PostId,
          shown: ShownRequest,
          text: string
        ) {
          yield* mayDecide(actor);

          return yield* desk.requestChanges(
            reviewerOf(actor),
            yield* postOf(actor, postId),
            shown,
            text
          );
        }
      );

      return PostReview.of({
        approve,
        comment,
        pending,
        requestChanges,
        resolve,
        thread,
      });
    })
  );
}
