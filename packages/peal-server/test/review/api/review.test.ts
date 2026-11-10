import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  ApprovalChanged,
  ApprovalNotPending,
  CommentInvalid,
  Forbidden,
  PostNotFound,
  ReviewAccessDenied,
  ReviewLinkClosed,
  ReviewLinkNotFound,
} from "peal-contract";
import type { Member, Permission, PostContent } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { ReviewLinkHandlers } from "#review/api/review-link.ts";
import { ReviewHandlers } from "#review/api/review.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import { connect } from "#test/publishing/posts-server.ts";
import { onReviewServerAt } from "#test/review/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import type { Role } from "#workspace/domain/roles.ts";

// The review endpoints over the real handlers and use cases: an agency
// writes a post, sends its client a link, the client comments and approves,
// and the post is scheduled.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshId = newId(WorkspaceIdSchema);

// A client whose every request acts as the user, with the role's rights.
// The review link endpoints need no sign-in: the same client calls them.
const clientAs = (userId: string, workspaceId: WorkspaceId, role: Role) => {
  const permissions: readonly Permission[] = permissionsFor(role);

  const member: Member = {
    permissions,
    principal: { _tag: "user", impersonatedBy: null, userId },
    workspaceId,
  };

  return HttpApiTest.groups(Api, ["posts", "review", "reviewLink"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        Layer.mergeAll(PostsHandlers, ReviewHandlers, ReviewLinkHandlers).pipe(
          Layer.provideMerge(securityTest(member))
        ),
        HttpServer.layerServices
      )
    )
  );
};

const words = "Launch day is here. Join us on Friday.";

const content: PostContent = { media: [], overrides: [], text: words };

describe("the review endpoints", () => {
  it.effect(
    "take a post from a contributor's draft to a client's approval",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* agency() {
          const workspaceId = yield* freshId;
          const contributorId = yield* freshId;
          const owner = yield* clientAs(yield* freshId, workspaceId, "owner");
          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");

          const contributor = yield* clientAs(
            contributorId,
            workspaceId,
            "contributor"
          );

          const channelId = yield* connect(workspaceId, "mastodon");
          const params = { workspaceId };

          // Only those who may change the workspace choose its policy.
          assert.deepStrictEqual(yield* editor.review.settings({ params }), {
            approvalPolicy: "never",
          });
          assert.deepStrictEqual(
            yield* Effect.flip(
              editor.review.updateSettings({
                params,
                payload: { approvalPolicy: "always" },
              })
            ),
            new Forbidden()
          );

          yield* owner.review.updateSettings({
            params,
            payload: { approvalPolicy: "contributorsAndApplications" },
          });

          const draft = yield* contributor.posts.create({
            params,
            payload: { channelIds: [channelId], content },
          });

          const post = { postId: draft.id, workspaceId };

          // Scheduling answers a post that waits, which the API shows.
          const asked = yield* contributor.posts.schedule({
            params: post,
            payload: {
              at: utc("2026-06-16T08:00:00Z"),
              channelIds: [channelId],
              timeZone: "Europe/Paris",
            },
          });

          assert.strictEqual(asked.status, "awaitingApproval");
          assert.deepStrictEqual(asked.schedule, {
            at: utc("2026-06-16T08:00:00Z"),
            timeZone: "Europe/Paris",
          });

          const [waiting] = yield* editor.review.pending({ params });

          assert.deepStrictEqual(
            {
              postId: waiting?.postId,
              requestedBy: waiting?.requestedBy,
              requestedVia: waiting?.requestedVia,
              status: waiting?.status,
            },
            {
              postId: draft.id,
              requestedBy: contributorId,
              requestedVia: "member",
              status: "pending",
            }
          );

          // The contributor may not make a link; the editor makes one that
          // lets the client approve.
          assert.deepStrictEqual(
            yield* Effect.flip(
              contributor.review.createLink({
                params: post,
                payload: { access: "approve" },
              })
            ),
            new Forbidden()
          );

          const made = yield* editor.review.createLink({
            params: post,
            payload: { access: "approve", expiresInHours: 48 },
          });

          assert.strictEqual(
            made.url,
            `http://localhost:3001/review#${made.token}`
          );
          assert.deepStrictEqual(
            made.link.expiresAt,
            utc("2026-06-17T07:00:00Z")
          );

          const headers = { "x-review-token": made.token };

          const page = yield* editor.reviewLink.open({ headers });

          assert.deepStrictEqual(
            {
              access: page.access,
              approval: page.approval?.status,
              // Through a link, no member's id.
              requestedBy: page.approval?.requestedBy,
              schedule: page.schedule,
              status: page.status,
              text: page.channels.map(({ text }) => text),
            },
            {
              access: "approve",
              approval: "pending",
              requestedBy: null,
              schedule: {
                at: utc("2026-06-16T08:00:00Z"),
                timeZone: "Europe/Paris",
              },
              status: "awaitingApproval",
              text: [words],
            }
          );

          const comment = yield* editor.reviewLink.comment({
            headers,
            payload: {
              anchor: {
                channelId,
                selection: { quote: "Friday", start: words.indexOf("Friday") },
              },
              locale: "fr",
              name: "Ada Lovelace",
              text: "<i>Friday</i> works for us.",
            },
          });

          assert.deepStrictEqual(
            {
              author: comment.author,
              located: comment.anchor?.selection?.located,
              text: comment.text,
            },
            {
              author: {
                kind: "visitor",
                linkId: null,
                name: "Ada Lovelace",
                userId: null,
              },
              located: { end: 37, start: 31 },
              text: "<i>Friday</i> works for us.",
            }
          );

          const decision = {
            approvalId: page.approval?.id ?? "",
            name: "Ada Lovelace",
            subjectHash: page.approval?.subjectHash ?? "",
          };

          // An approval of something else than the page showed is for
          // nothing: the reviewer looks again.
          assert.deepStrictEqual(
            yield* Effect.flip(
              editor.reviewLink.approve({
                headers,
                payload: { ...decision, subjectHash: "0".repeat(64) },
              })
            ),
            new ApprovalChanged()
          );
          assert.deepStrictEqual(
            yield* editor.reviewLink.approve({ headers, payload: decision }),
            { late: false }
          );

          // The post is scheduled, and its review says who approved it.
          const approved = yield* contributor.posts.get({ params: post });
          const thread = yield* contributor.review.thread({ params: post });

          assert.strictEqual(approved.status, "scheduled");
          // The review shows the post the approval was for, as the page
          // did, with the fingerprint its decision named.
          assert.deepStrictEqual(
            [
              thread.channels,
              thread.approvals.map((request) => request.subjectHash),
            ],
            [page.channels, [decision.subjectHash]]
          );
          assert.deepStrictEqual(
            thread.approvals.map((request) => ({
              by: request.decision?.by,
              status: request.status,
            })),
            [
              {
                by: {
                  kind: "visitor",
                  linkId: made.link.id,
                  name: "Ada Lovelace",
                  userId: null,
                },
                status: "approved",
              },
            ]
          );

          // Decided once.
          assert.deepStrictEqual(
            yield* Effect.flip(
              editor.reviewLink.approve({ headers, payload: decision })
            ),
            new ApprovalNotPending()
          );
        })
      ),
    timeout
  );

  it.effect(
    "answer what a link may not do, and nothing to a token nobody was given",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* refusals() {
          const workspaceId = yield* freshId;
          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");
          const channelId = yield* connect(workspaceId, "mastodon");

          const draft = yield* editor.posts.create({
            params: { workspaceId },
            payload: { channelIds: [channelId], content },
          });

          const post = { postId: draft.id, workspaceId };

          const view = yield* editor.review.createLink({
            params: post,
            payload: { access: "view" },
          });

          const headers = { "x-review-token": view.token };
          const said = { locale: "en" as const, name: "Ada", text: "Hello." };

          assert.deepStrictEqual(
            yield* Effect.flip(
              editor.reviewLink.comment({ headers, payload: said })
            ),
            new ReviewAccessDenied({ needed: "comment" })
          );
          assert.deepStrictEqual(
            yield* Effect.flip(
              editor.reviewLink.open({
                headers: { "x-review-token": "not-a-token" },
              })
            ),
            new ReviewLinkNotFound()
          );

          const revoked = yield* editor.review.revokeLink({
            params: { linkId: view.link.id, workspaceId },
          });

          assert.strictEqual(revoked.status, "revoked");
          assert.deepStrictEqual(
            yield* Effect.flip(editor.reviewLink.open({ headers })),
            new ReviewLinkClosed({ reason: "revoked" })
          );
          assert.deepStrictEqual(
            (yield* editor.review.links({ params: post })).map(
              ({ status }) => status
            ),
            ["revoked"]
          );
        })
      ),
    timeout
  );

  it.effect(
    "keep each workspace's reviews to itself, and refuse what cannot be kept",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* isolation() {
          const workspaceId = yield* freshId;
          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");
          const viewer = yield* clientAs(yield* freshId, workspaceId, "viewer");

          const outsider = yield* clientAs(
            yield* freshId,
            yield* freshId,
            "owner"
          );

          const channelId = yield* connect(workspaceId, "mastodon");

          const draft = yield* editor.posts.create({
            params: { workspaceId },
            payload: { channelIds: [channelId], content },
          });

          const post = { postId: draft.id, workspaceId };

          const note = yield* editor.review.comment({
            params: post,
            payload: { text: "A note for the team." },
          });

          const answer = yield* editor.review.comment({
            params: post,
            payload: { parentId: note.id, text: "An answer." },
          });

          assert.strictEqual(answer.parentId, note.id);

          // An answer is not resolved; its thread is.
          assert.deepStrictEqual(
            yield* Effect.flip(
              editor.review.resolve({
                params: { ...post, commentId: answer.id },
                payload: { resolved: true },
              })
            ),
            new CommentInvalid({ problem: "parent" })
          );

          const resolved = yield* editor.review.resolve({
            params: { ...post, commentId: note.id },
            payload: { resolved: true },
          });

          assert.strictEqual(resolved.resolved?.by.kind, "member");

          assert.lengthOf(
            (yield* viewer.review.thread({ params: post })).comments,
            2
          );
          assert.deepStrictEqual(
            yield* Effect.flip(
              viewer.review.comment({
                params: post,
                payload: { text: "May I?" },
              })
            ),
            new Forbidden()
          );

          // Another workspace's owner, naming the post in their own.
          assert.deepStrictEqual(
            yield* Effect.flip(
              outsider.review.thread({
                params: { ...post, workspaceId: yield* freshId },
              })
            ),
            new PostNotFound()
          );
          assert.deepStrictEqual(
            yield* Effect.flip(
              editor.review.approve({
                params: post,
                payload: { approvalId: "none", subjectHash: "none" },
              })
            ),
            new ApprovalNotPending()
          );
        })
      ),
    timeout
  );
});
