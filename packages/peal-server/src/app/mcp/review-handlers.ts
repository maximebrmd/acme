import { DateTime, Effect, Option } from "effect";
import { CurrentMember } from "peal-contract";

import { notAllowed, planRefusal, refuse } from "#app/mcp/refusals.ts";
import { ReviewTools } from "#app/mcp/review-tools.ts";
import {
  lifetimeOf,
  linkIdOf,
  postIdOf,
  shownOf,
} from "#review/api/review-input.ts";
import { approvalView, linkView, threadView } from "#review/api/review-view.ts";
import { PostReview } from "#review/application/post-review.ts";
import { ReviewLinks } from "#review/application/review-links.ts";
import { noMedia } from "#review/application/shown-media.ts";
import { actorOf } from "#shared/api/actor.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { PostId } from "#shared/domain/ids.ts";

// What the use cases' refusals tell the user, through their MCP client.

const notFound = () => refuse("The workspace has no post with this id.");

const notPending = () =>
  refuse(
    "The post does not wait for an approval: none was asked, or it was already decided, withdrawn or scheduled. list_approvals answers those that wait."
  );

const changed = () =>
  refuse(
    "The post waits for an approval, but not the one named: it was asked again, or says something else since the user was shown it. Read get_post_review again, show the user what the post says now, and decide with the approval's new id and subjectHash only if they still agree."
  );

const needsPerson = () =>
  refuse(
    "An application or an API key asked for this post to go out, so it waits for a person: a member approves it in the web app, or a reviewer through a review link a member made there."
  );

const commentRejected = () =>
  refuse(
    "The comment cannot be kept: it is empty once control characters are removed, or longer than 2000 characters."
  );

const noSuchLink = () =>
  refuse(
    "The workspace has no review link with this id: list_review_links answers a post's links."
  );

const postOf = (raw: string) =>
  Option.match(postIdOf(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

/** What the review tools do, through the review context's use cases. */
export const ReviewToolsLive = ReviewTools.toLayer(
  Effect.gen(function* reviewTools() {
    const review = yield* PostReview;
    const links = yield* ReviewLinks;
    const refusedByPlan = yield* planRefusal;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    // The post's review as it is after a change, for its answer.
    const threadOf = (member: Actor, postId: PostId) =>
      review.thread(member, postId).pipe(
        // An AI model is handed no file: each is named by its id and its
        // alt text.
        Effect.map((thread) => threadView(thread, noMedia)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          MissingPermission: notAllowed("read posts"),
          ReviewPostNotFound: notFound,
        })
      );

    return ReviewTools.of({
      approve_post: ({ postId: raw, ...shown }) =>
        Effect.gen(function* approvePost() {
          const member = yield* actor;
          const postId = yield* postOf(raw);

          const { late, request } = yield* review
            .approve(member, postId, shownOf(shown))
            .pipe(
              Effect.catchTags({
                ApprovalChanged: changed,
                ApprovalNeedsPerson: needsPerson,
                ApprovalNotPending: notPending,
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("approve posts"),
                PlanLimitReached: refusedByPlan(
                  member.workspaceId,
                  "Nothing was approved, and the post still waits: its workspace schedules nothing while it holds more than its plan allows."
                ),
                ReviewPostNotFound: notFound,
              })
            );

          const { approvals } = yield* threadOf(member, postId);
          const approval = approvals.find(({ id }) => id === request.id);

          return approval === undefined
            ? yield* Effect.die("An approval just made is not in its thread")
            : { approval, late };
        }),
      create_review_link: ({ access, expiresInHours, postId: raw }) =>
        Effect.gen(function* createReviewLink() {
          const postId = yield* postOf(raw);

          const { link, token, url } = yield* links
            .create(yield* actor, postId, {
              access,
              lifetime: lifetimeOf(expiresInHours),
            })
            .pipe(
              Effect.catchTags({
                // The tool asks for none, but the rule is the use case's.
                ApprovalNeedsPerson: () =>
                  refuse(
                    "A link that approves is made by a person in the web app: this one may view or comment only."
                  ),
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("make review links"),
                PostNotReviewable: ({ status }) =>
                  refuse(
                    `The post is ${status}: a review link is made for a draft, a post that waits for an approval or a scheduled one.`
                  ),
                ReviewPostNotFound: notFound,
                TooManyLinks: ({ limit }) =>
                  refuse(
                    `The post already has ${String(limit)} review links that work: revoke one with revoke_review_link first.`
                  ),
              })
            );

          return { link: linkView(link, yield* DateTime.now), token, url };
        }),
      get_post_review: ({ postId: raw }) =>
        Effect.gen(function* getPostReview() {
          return yield* threadOf(yield* actor, yield* postOf(raw));
        }),
      list_approvals: () =>
        Effect.gen(function* listApprovals() {
          const { names, requests } = yield* review.pending(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read posts"),
            })
          );

          return {
            approvals: requests.map((request) =>
              approvalView(request, { names, toWorkspace: true })
            ),
          };
        }),
      list_review_links: ({ postId: raw }) =>
        Effect.gen(function* listReviewLinks() {
          const made = yield* links
            .ofPost(yield* actor, yield* postOf(raw))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read posts"),
                ReviewPostNotFound: notFound,
              })
            );

          const now = yield* DateTime.now;

          return { links: made.map((link) => linkView(link, now)) };
        }),
      request_changes: ({ comment, postId: raw, ...shown }) =>
        Effect.gen(function* requestChanges() {
          const member = yield* actor;
          const postId = yield* postOf(raw);

          const sentBack = yield* review
            .requestChanges(member, postId, shownOf(shown), comment)
            .pipe(
              Effect.catchTags({
                ApprovalChanged: changed,
                ApprovalNotPending: notPending,
                CommentRejected: commentRejected,
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("approve posts"),
                ReviewPostNotFound: notFound,
              })
            );

          const thread = yield* threadOf(member, postId);

          const approval = thread.approvals.find(
            ({ id }) => id === sentBack.request.id
          );

          const written = thread.comments.find(
            ({ id }) => id === sentBack.comment.id
          );

          return approval === undefined || written === undefined
            ? yield* Effect.die("A decision just made is not in its thread")
            : { approval, comment: written };
        }),
      revoke_review_link: ({ linkId: raw }) =>
        Effect.gen(function* revokeReviewLink() {
          const linkId = linkIdOf(raw);

          if (Option.isNone(linkId)) {
            return yield* noSuchLink();
          }

          const revoked = yield* links.revoke(yield* actor, linkId.value).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("revoke review links"),
              ReviewLinkNotFound: noSuchLink,
            })
          );

          return linkView(revoked, yield* DateTime.now);
        }),
    });
  })
);
