import { DateTime, Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ApprovalChanged,
  ApprovalNotPending,
  CommentInvalid,
  CommentNotFound,
  CurrentMember,
  Forbidden,
  PostNotFound,
  PostNotReviewable,
  ReviewLinkNotFound,
  TooManyReviewLinks,
} from "peal-contract";

import { PostReview } from "#review/application/post-review.ts";
import { ReviewLinks } from "#review/application/review-links.ts";
import { ReviewSettings } from "#review/application/review-settings.ts";
import { actorOf } from "#shared/api/actor.ts";

import {
  commentIdOf,
  draftOf,
  lifetimeOf,
  linkIdOf,
  postIdOf,
  shownOf,
} from "./review-input.ts";
import { approvalView, linkView, threadView } from "./review-view.ts";

// How the use cases' failures answer. A database failure is a server error.

const forbidden = () => Effect.fail(new Forbidden());

const postNotFound = () => Effect.fail(new PostNotFound());

const notPending = () => Effect.fail(new ApprovalNotPending());

const changed = () => Effect.fail(new ApprovalChanged());

const invalid = ({
  problem,
}: {
  readonly problem: CommentInvalid["problem"];
}) => Effect.fail(new CommentInvalid({ problem }));

const postIdFrom = (raw: string) =>
  Option.match(postIdOf(raw), {
    onNone: postNotFound,
    onSome: Effect.succeed,
  });

export const ReviewHandlers = HttpApiBuilder.group(
  Api,
  "review",
  Effect.fn(function* reviewHandlers(handlers) {
    const links = yield* ReviewLinks;
    const review = yield* PostReview;
    const settings = yield* ReviewSettings;

    // The post's review as it is after a change, for its answer.
    const threadOf = (
      actor: ReturnType<typeof actorOf>,
      postId: Parameters<typeof review.thread>[1]
    ) =>
      review.thread(actor, postId).pipe(
        Effect.map((thread) => threadView(thread)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          MissingPermission: forbidden,
          ReviewPostNotFound: postNotFound,
        })
      );

    return handlers.handleAll({
      approve: ({ params, payload }) =>
        Effect.gen(function* approve() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const { late, request } = yield* review
            .approve(actor, postId, shownOf(payload))
            .pipe(
              Effect.catchTags({
                ApprovalChanged: changed,
                // An application's request waits for a person.
                ApprovalNeedsPerson: forbidden,
                ApprovalNotPending: notPending,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                ReviewPostNotFound: postNotFound,
              })
            );

          const { approvals } = yield* threadOf(actor, postId);
          const approval = approvals.find(({ id }) => id === request.id);

          return approval === undefined
            ? yield* Effect.die("An approval just made is not in its thread")
            : { approval, late };
        }),
      comment: ({ params, payload }) =>
        Effect.gen(function* comment() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);
          const input = draftOf(payload);

          if (input._tag === "invalid") {
            return yield* invalid(input);
          }

          const written = yield* review
            .comment(actor, postId, input.draft)
            .pipe(
              Effect.catchTags({
                CommentRejected: invalid,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                ReviewPostNotFound: postNotFound,
              })
            );

          const { comments } = yield* threadOf(actor, postId);
          const view = comments.find(({ id }) => id === written.id);

          return (
            view ??
            (yield* Effect.die("A comment just written is not in its thread"))
          );
        }),
      createLink: ({ params, payload }) =>
        Effect.gen(function* createLink() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const { link, token, url } = yield* links
            .create(actor, postId, {
              access: payload.access,
              lifetime: lifetimeOf(payload.expiresInHours),
            })
            .pipe(
              Effect.catchTags({
                // A link that approves is made in person.
                ApprovalNeedsPerson: forbidden,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                PostNotReviewable: ({ status }) =>
                  Effect.fail(new PostNotReviewable({ status })),
                ReviewPostNotFound: postNotFound,
                TooManyLinks: ({ limit }) =>
                  Effect.fail(new TooManyReviewLinks({ limit })),
              })
            );

          return { link: linkView(link, yield* DateTime.now), token, url };
        }),
      links: ({ params }) =>
        Effect.gen(function* listLinks() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const made = yield* links.ofPost(actor, postId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              ReviewPostNotFound: postNotFound,
            })
          );

          const now = yield* DateTime.now;

          return made.map((link) => linkView(link, now));
        }),
      pending: () =>
        Effect.gen(function* pending() {
          const actor = actorOf(yield* CurrentMember);

          const { names, requests } = yield* review.pending(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return requests.map((request) =>
            approvalView(request, { names, toWorkspace: true })
          );
        }),
      requestChanges: ({ params, payload }) =>
        Effect.gen(function* requestChanges() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const sentBack = yield* review
            .requestChanges(actor, postId, shownOf(payload), payload.comment)
            .pipe(
              Effect.catchTags({
                ApprovalChanged: changed,
                ApprovalNotPending: notPending,
                CommentRejected: invalid,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                ReviewPostNotFound: postNotFound,
              })
            );

          const { approvals, comments } = yield* threadOf(actor, postId);

          const approval = approvals.find(
            ({ id }) => id === sentBack.request.id
          );

          const comment = comments.find(({ id }) => id === sentBack.comment.id);

          return approval === undefined || comment === undefined
            ? yield* Effect.die("A decision just made is not in its thread")
            : { approval, comment };
        }),
      resolve: ({ params, payload }) =>
        Effect.gen(function* resolve() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);
          const commentId = commentIdOf(params.commentId);

          if (Option.isNone(commentId)) {
            return yield* new CommentNotFound();
          }

          const resolved = yield* review
            .resolve(actor, postId, commentId.value, payload.resolved)
            .pipe(
              Effect.catchTags({
                CommentNotFound: () => Effect.fail(new CommentNotFound()),
                CommentRejected: invalid,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                ReviewPostNotFound: postNotFound,
              })
            );

          const { comments } = yield* threadOf(actor, postId);
          const view = comments.find(({ id }) => id === resolved.id);

          return (
            view ??
            (yield* Effect.die("A comment just resolved is not in its thread"))
          );
        }),
      revokeLink: ({ params }) =>
        Effect.gen(function* revokeLink() {
          const actor = actorOf(yield* CurrentMember);
          const linkId = linkIdOf(params.linkId);

          if (Option.isNone(linkId)) {
            return yield* new ReviewLinkNotFound();
          }

          const revoked = yield* links.revoke(actor, linkId.value).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              ReviewLinkNotFound: () => Effect.fail(new ReviewLinkNotFound()),
            })
          );

          return linkView(revoked, yield* DateTime.now);
        }),
      settings: () =>
        Effect.gen(function* getSettings() {
          const actor = actorOf(yield* CurrentMember);

          const approvalPolicy = yield* settings.policy(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return { approvalPolicy };
        }),
      thread: ({ params }) =>
        Effect.gen(function* thread() {
          const actor = actorOf(yield* CurrentMember);

          return yield* threadOf(actor, yield* postIdFrom(params.postId));
        }),
      updateSettings: ({ payload }) =>
        Effect.gen(function* updateSettings() {
          const actor = actorOf(yield* CurrentMember);

          const approvalPolicy = yield* settings
            .setPolicy(actor, payload.approvalPolicy)
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );

          return { approvalPolicy };
        }),
    });
  })
);
