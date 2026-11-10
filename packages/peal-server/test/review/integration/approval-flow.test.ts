import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { ApprovalNeedsPerson } from "#review/application/approval-needs-person.ts";
import { ApprovalStore } from "#review/application/ports/approval-store.ts";
import { PostReview } from "#review/application/post-review.ts";
import { ApprovalNotPending } from "#review/domain/approval-not-pending.ts";
import { reviewerOf } from "#review/domain/reviewer.ts";
import { newId } from "#shared/application/ids.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import {
  callsOn,
  eventually,
  isFinished,
  isSuspended,
  scheduleIn,
  setTime,
  settle,
  storedPost,
} from "#test/publishing/infrastructure/harness.ts";
import { connect } from "#test/publishing/posts-server.ts";
import { actorAs, apiKeyIn, contentOf } from "#test/publishing/support.ts";
import {
  impersonating,
  onReviewServerAt,
  throughClient,
  Told,
  withPolicy,
} from "#test/review/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Scheduling in workspaces that ask for approvals, through the real gate:
// who waits under each policy, what an approval and a refusal do to the
// post, and what stops standing once the post changes.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const at8 = scheduleIn("2026-06-15T08:00:00Z");

const freshWorkspace = newId(WorkspaceIdSchema);

const freshUser = newId(WorkspaceIdSchema).pipe(
  Effect.map((id) => UserIdSchema.make(id))
);

const statusOf = (postId: Parameters<typeof storedPost>[0]) =>
  storedPost(postId).pipe(Effect.map(({ post }) => post.status._tag));

// A workspace with a channel, an editor and a contributor.
const team = Effect.gen(function* team() {
  const workspaceId: WorkspaceId = yield* freshWorkspace;

  return {
    channelId: yield* connect(workspaceId, "mastodon"),
    contributor: actorAs(
      yield* freshUser,
      workspaceId,
      permissionsFor("contributor")
    ),
    editor: actorAs(yield* freshUser, workspaceId),
    workspaceId,
  };
});

const kinds = Told.use((told) => told.outcomes).pipe(
  Effect.map((outcomes) => outcomes.map(({ kind }) => kind))
);

describe("a workspace that never asks for approvals", () => {
  it.effect(
    "schedules an editor's post, and takes nothing from a contributor",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* never() {
          const scheduling = yield* PostScheduling;
          const { channelId, contributor, editor } = yield* team;

          const request = {
            channelIds: [channelId] as const,
            content: contentOf("A synthetic post, no approval."),
            schedule: at8,
          };

          const { post } = yield* scheduling.schedule(editor, request);

          assert.strictEqual(post.status._tag, "scheduled");
          assert.deepStrictEqual(
            yield* Effect.flip(scheduling.schedule(contributor, request)),
            new MissingPermission({ permission: "post:schedule" })
          );
          assert.deepStrictEqual(yield* kinds, []);
        })
      ),
    timeout
  );
});

describe("a workspace where contributors and applications wait", () => {
  it.effect(
    "holds a contributor's, an API key's and an OAuth client's posts, not an editor's",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* whoWaits() {
          const scheduling = yield* PostScheduling;
          const review = yield* PostReview;
          const { channelId, contributor, editor, workspaceId } = yield* team;

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const request = {
            channelIds: [channelId] as const,
            content: contentOf("A synthetic post, perhaps approved."),
            schedule: at8,
          };

          const statuses = yield* Effect.forEach(
            [
              editor,
              contributor,
              apiKeyIn(workspaceId),
              throughClient(yield* freshUser, workspaceId),
            ],
            (actor) =>
              scheduling
                .schedule(actor, request)
                .pipe(Effect.map(({ post }) => post.status._tag)),
            { concurrency: 1 }
          );

          assert.deepStrictEqual(statuses, [
            "scheduled",
            "awaitingApproval",
            "awaitingApproval",
            "awaitingApproval",
          ]);

          const { requests } = yield* review.pending(editor);

          assert.deepStrictEqual(
            requests.map(({ requestedVia, status }) => [requestedVia, status]),
            [
              ["member", "pending"],
              ["apiKey", "pending"],
              ["application", "pending"],
            ]
          );
        })
      ),
    timeout
  );

  it.effect(
    "sends a held post at its time once someone who may approves it",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* approves() {
          const scheduling = yield* PostScheduling;
          const review = yield* PostReview;
          const { channelId, contributor, editor, workspaceId } = yield* team;

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const { post } = yield* scheduling.schedule(contributor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post to approve."),
            schedule: at8,
          });

          // Neither its author, nor staff acting as an owner.
          for (const refused of [
            contributor,
            impersonating(yield* freshUser, yield* freshUser, workspaceId),
          ]) {
            assert.deepStrictEqual(
              yield* Effect.flip(review.approve(refused, post.id)),
              new MissingPermission({ permission: "post:approve" })
            );
          }

          const { late, request } = yield* review.approve(editor, post.id);

          assert.isFalse(late);
          assert.strictEqual(request.status, "approved");
          assert.deepStrictEqual(
            request.decision.pipe(Option.map(({ by }) => by)),
            Option.some(reviewerOf(editor))
          );
          assert.strictEqual(yield* statusOf(post.id), "scheduled");

          // Decided once.
          assert.deepStrictEqual(
            yield* Effect.flip(review.approve(editor, post.id)),
            new ApprovalNotPending({ postId: post.id })
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(channelId), 1);
          assert.deepStrictEqual(yield* kinds, [
            "approvalRequested",
            "settled",
            "approved",
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "takes an application's approval of a member's request, never of an application's",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* applications() {
          const scheduling = yield* PostScheduling;
          const review = yield* PostReview;
          const { channelId, contributor, editor, workspaceId } = yield* team;
          const client = throughClient(yield* freshUser, workspaceId);

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const request = {
            channelIds: [channelId] as const,
            content: contentOf("A synthetic post an application meets."),
            schedule: at8,
          };

          const byMember = yield* scheduling.schedule(contributor, request);

          const byKey = yield* scheduling.schedule(
            apiKeyIn(workspaceId),
            request
          );

          const byClient = yield* scheduling.schedule(client, request);

          // What an application asked for waits for a person.
          for (const { post } of [byKey, byClient]) {
            for (const application of [client, apiKeyIn(workspaceId)]) {
              assert.deepStrictEqual(
                yield* Effect.flip(review.approve(application, post.id)),
                new ApprovalNeedsPerson({ postId: post.id })
              );
            }
          }

          assert.strictEqual(
            (yield* review.approve(client, byMember.post.id)).request.status,
            "approved"
          );
          assert.strictEqual(
            (yield* review.approve(editor, byKey.post.id)).request.status,
            "approved"
          );

          // Moved by an application, a member's request is the application's.
          const again = yield* scheduling.schedule(contributor, request);

          yield* scheduling.reschedule(
            client,
            again.post.id,
            scheduleIn("2026-06-15T09:00:00Z")
          );

          assert.deepStrictEqual(
            yield* Effect.flip(review.approve(client, again.post.id)),
            new ApprovalNeedsPerson({ postId: again.post.id })
          );
        })
      ),
    timeout
  );

  it.effect(
    "sends a post back to draft with a comment when changes are asked for",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* sendsBack() {
          const scheduling = yield* PostScheduling;
          const drafts = yield* PostDrafts;
          const review = yield* PostReview;
          const { channelId, contributor, editor, workspaceId } = yield* team;

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const { post } = yield* scheduling.schedule(contributor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post to chnage."),
            schedule: at8,
          });

          const sentBack = yield* review.requestChanges(
            editor,
            post.id,
            "There is a typo in the last word."
          );

          assert.strictEqual(sentBack.request.status, "changesRequested");
          assert.strictEqual(yield* statusOf(post.id), "draft");

          const thread = yield* review.thread(contributor, post.id);

          assert.deepStrictEqual(
            thread.comments.map(({ text }) => text),
            ["There is a typo in the last word."]
          );

          // Corrected and asked again, it waits again, under a new request.
          yield* drafts.update(contributor, post.id, {
            channelIds: [channelId],
            content: contentOf("A synthetic post to change."),
          });

          const again = yield* scheduling.reschedule(contributor, post.id, at8);

          assert.strictEqual(again.post.status._tag, "awaitingApproval");
          assert.deepStrictEqual(
            (yield* review.thread(editor, post.id)).requests.map(
              ({ status }) => status
            ),
            ["pending", "changesRequested"]
          );
          assert.deepStrictEqual(yield* kinds, [
            "approvalRequested",
            "settled",
            "changesRequested",
            "approvalRequested",
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "takes a post approved after its time back to draft, still approved",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* late() {
          const scheduling = yield* PostScheduling;
          const review = yield* PostReview;
          const { channelId, contributor, editor, workspaceId } = yield* team;

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const { post } = yield* scheduling.schedule(contributor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post approved late."),
            schedule: at8,
          });

          yield* setTime("2026-06-15T09:30:00Z");

          const approved = yield* review.approve(editor, post.id);

          assert.isTrue(approved.late);
          assert.strictEqual(yield* statusOf(post.id), "draft");

          yield* settle();

          assert.lengthOf(yield* callsOn(channelId), 0);

          // Its author gives it a new time: the approval still stands.
          const again = yield* scheduling.reschedule(
            contributor,
            post.id,
            scheduleIn("2026-06-15T10:00:00Z")
          );

          assert.strictEqual(again.post.status._tag, "scheduled");
        })
      ),
    timeout
  );

  it.effect(
    "withdraws the request when the post is taken back, and asks again for a changed post",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* withdraws() {
          const scheduling = yield* PostScheduling;
          const drafts = yield* PostDrafts;
          const review = yield* PostReview;
          const requests = yield* ApprovalStore;
          const { channelId, contributor, editor, workspaceId } = yield* team;

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const { post } = yield* scheduling.schedule(contributor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post, first wording."),
            schedule: at8,
          });

          yield* scheduling.unschedule(contributor, post.id);

          assert.deepStrictEqual(
            (yield* requests.ofPost(workspaceId, post.id)).map(
              ({ status }) => status
            ),
            ["withdrawn"]
          );
          assert.deepStrictEqual(
            yield* Effect.flip(review.approve(editor, post.id)),
            new ApprovalNotPending({ postId: post.id })
          );

          // Asked again and approved, then changed: the approval was for
          // the first wording, and the post waits again.
          yield* scheduling.reschedule(contributor, post.id, at8);
          yield* review.approve(editor, post.id);
          yield* scheduling.unschedule(editor, post.id);
          yield* drafts.update(contributor, post.id, {
            channelIds: [channelId],
            content: contentOf("A synthetic post, second wording."),
          });

          const changed = yield* scheduling.reschedule(
            contributor,
            post.id,
            at8
          );

          assert.strictEqual(changed.post.status._tag, "awaitingApproval");
        })
      ),
    timeout
  );

  it.effect(
    "lets an editor schedule a post that waits, which settles its request",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* editorSchedules() {
          const scheduling = yield* PostScheduling;
          const requests = yield* ApprovalStore;
          const { channelId, contributor, editor, workspaceId } = yield* team;

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const { post } = yield* scheduling.schedule(contributor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post an editor takes on."),
            schedule: at8,
          });

          const moved = yield* scheduling.reschedule(editor, post.id, at8);

          assert.strictEqual(moved.post.status._tag, "scheduled");
          assert.deepStrictEqual(
            (yield* requests.ofPost(workspaceId, post.id)).map(
              ({ status }) => status
            ),
            ["withdrawn"]
          );
        })
      ),
    timeout
  );
});

describe("a workspace where every post waits", () => {
  it.effect(
    "holds an editor's post too, which an editor may approve",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* always() {
          const scheduling = yield* PostScheduling;
          const review = yield* PostReview;
          const { channelId, editor, workspaceId } = yield* team;

          yield* withPolicy(workspaceId, "always");

          const { post } = yield* scheduling.schedule(editor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post everyone waits for."),
            schedule: at8,
          });

          assert.strictEqual(post.status._tag, "awaitingApproval");

          yield* review.approve(editor, post.id);

          assert.strictEqual(yield* statusOf(post.id), "scheduled");
        })
      ),
    timeout
  );
});
