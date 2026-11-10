import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";

import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { ApprovalNeedsPerson } from "#review/application/approval-needs-person.ts";
import { LinkAccessDenied } from "#review/application/link-access-denied.ts";
import { ApprovalStore } from "#review/application/ports/approval-store.ts";
import { VisitorGuard } from "#review/application/ports/visitor-guard.ts";
import { PostReview } from "#review/application/post-review.ts";
import { ReviewLinks } from "#review/application/review-links.ts";
import { VisitorReview } from "#review/application/visitor-review.ts";
import { ApprovalNotPending } from "#review/domain/approval-not-pending.ts";
import { reviewerOf } from "#review/domain/reviewer.ts";
import { newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
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
import { Heard } from "#test/review/heard.ts";
import {
  impersonating,
  onReviewServerAt,
  reviewServerWith,
  shown,
  throughClient,
  Told,
  visitor,
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
              yield* Effect.flip(
                review.approve(refused, post.id, yield* shown(post))
              ),
              new MissingPermission({ permission: "post:approve" })
            );
          }

          const { late, request } = yield* review.approve(
            editor,
            post.id,
            yield* shown(post)
          );

          assert.isFalse(late);
          assert.strictEqual(request.status, "approved");
          assert.deepStrictEqual(
            request.decision.pipe(Option.map(({ by }) => by)),
            Option.some(reviewerOf(editor))
          );
          assert.strictEqual(yield* statusOf(post.id), "scheduled");

          // Decided once.
          assert.deepStrictEqual(
            yield* Effect.flip(
              review.approve(editor, post.id, yield* shown(post))
            ),
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
    "holds a post sent in one call as one scheduled in two, and tells nobody it is scheduled until it is approved",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* sends() {
          const scheduling = yield* PostScheduling;
          const review = yield* PostReview;
          const heard = Heard.use(({ events }) => events);
          const { channelId, contributor, editor, workspaceId } = yield* team;

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const sent = (actor: Actor, text: string) =>
            scheduling.send(actor, {
              at: Option.some(at8.at),
              channelIds: [channelId],
              content: contentOf(text),
              idempotency: Option.none(),
              timeZone: at8.timeZone,
            });

          // An application's, and a contributor's, who may not schedule
          // but may ask here.
          const byKey = yield* sent(apiKeyIn(workspaceId), "Sent by a key.");
          const byContributor = yield* sent(contributor, "Sent by a member.");

          assert.deepStrictEqual(
            [byKey.post.status._tag, byContributor.post.status._tag],
            ["awaitingApproval", "awaitingApproval"]
          );
          assert.isTrue(
            Option.isNone((yield* storedPost(byKey.post.id)).execution)
          );
          assert.deepStrictEqual(yield* heard, []);

          // An editor's goes straight out, and is told at once.
          const byEditor = yield* sent(editor, "Sent by an editor.");

          assert.strictEqual(byEditor.post.status._tag, "scheduled");
          assert.deepStrictEqual(yield* heard, [
            ["scheduled", byEditor.post.id],
          ]);

          // Approved, the key's post is scheduled, and told then.
          yield* review.approve(
            editor,
            byKey.post.id,
            yield* shown(byKey.post)
          );

          assert.deepStrictEqual(yield* heard, [
            ["scheduled", byEditor.post.id],
            ["scheduled", byKey.post.id],
          ]);

          // Moved while it waits, the contributor's is asked for again,
          // under the same request, so that whoever follows the workspace
          // knows its new time; nobody is asked twice to decide.
          yield* scheduling.reschedule(
            contributor,
            byContributor.post.id,
            scheduleIn("2026-06-15T09:00:00Z")
          );

          const asked = (yield* Told.use((told) => told.outcomes)).filter(
            ({ kind }) => kind === "approvalRequested"
          );

          assert.deepStrictEqual(
            asked.map(({ key }) => key),
            [asked[0]?.key, asked[1]?.key, asked[1]?.key]
          );

          // Taken back while it waits, it was never scheduled, yet those
          // who heard it waited hear it no longer does.
          yield* scheduling.unschedule(contributor, byContributor.post.id);

          assert.deepStrictEqual(yield* heard, [
            ["scheduled", byEditor.post.id],
            ["scheduled", byKey.post.id],
            ["unscheduled", byContributor.post.id],
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "sends nothing for someone who may not schedule where nobody approves",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* refused() {
          const scheduling = yield* PostScheduling;
          const { channelId, contributor } = yield* team;

          assert.deepStrictEqual(
            yield* Effect.flip(
              scheduling.send(contributor, {
                at: Option.none(),
                channelIds: [channelId],
                content: contentOf("Not theirs to send."),
                idempotency: Option.none(),
                timeZone: at8.timeZone,
              })
            ),
            new MissingPermission({ permission: "post:schedule" })
          );
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
                yield* Effect.flip(
                  review.approve(application, post.id, yield* shown(post))
                ),
                new ApprovalNeedsPerson({ postId: post.id })
              );
            }
          }

          assert.strictEqual(
            (yield* review.approve(
              client,
              byMember.post.id,
              yield* shown(byMember.post)
            )).request.status,
            "approved"
          );
          assert.strictEqual(
            (yield* review.approve(
              editor,
              byKey.post.id,
              yield* shown(byKey.post)
            )).request.status,
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
            yield* Effect.flip(
              review.approve(client, again.post.id, yield* shown(again.post))
            ),
            new ApprovalNeedsPerson({ postId: again.post.id })
          );
        })
      ),
    timeout
  );

  it.effect(
    "gives no application a link that approves, so none approves its own post through one",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* ownLink() {
          const scheduling = yield* PostScheduling;
          const links = yield* ReviewLinks;
          const visitors = yield* VisitorReview;
          const { channelId, editor, workspaceId } = yield* team;
          const client = throughClient(yield* freshUser, workspaceId);
          const key = apiKeyIn(workspaceId);

          yield* withPolicy(workspaceId, "contributorsAndApplications");

          const { post } = yield* scheduling.schedule(key, {
            channelIds: [channelId] as const,
            content: contentOf("A synthetic post its application would pass."),
            schedule: at8,
          });

          const approving = {
            access: "approve" as const,
            lifetime: Option.none(),
          };

          for (const application of [key, client]) {
            assert.deepStrictEqual(
              yield* Effect.flip(links.create(application, post.id, approving)),
              new ApprovalNeedsPerson({ postId: post.id })
            );
          }

          // An application still shows a post, and takes comments on it.
          const commenting = yield* links.create(key, post.id, {
            access: "comment",
            lifetime: Option.none(),
          });

          assert.deepStrictEqual(
            yield* Effect.flip(
              visitors.approve(commenting.token, visitor(), yield* shown(post))
            ),
            new LinkAccessDenied({ needed: "approve" })
          );

          // A link a person made approves what an application asked for.
          const { token } = yield* links.create(editor, post.id, approving);

          assert.deepStrictEqual(
            yield* visitors.approve(token, visitor(), yield* shown(post)),
            { late: false }
          );
          assert.strictEqual(yield* statusOf(post.id), "scheduled");
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
            yield* shown(post),
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

          const approved = yield* review.approve(
            editor,
            post.id,
            yield* shown(post)
          );

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
            yield* Effect.flip(
              review.approve(editor, post.id, yield* shown(post))
            ),
            new ApprovalNotPending({ postId: post.id })
          );

          // Asked again and approved, then changed: the approval was for
          // the first wording, and the post waits again.
          yield* scheduling.reschedule(contributor, post.id, at8);
          yield* review.approve(editor, post.id, yield* shown(post));
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

          yield* review.approve(editor, post.id, yield* shown(post));

          assert.strictEqual(yield* statusOf(post.id), "scheduled");
        })
      ),
    timeout
  );
});

// A workspace whose members grow past what its plan allows while a post
// waits: three seats, and as many members as the test says.
const members = Ref.makeUnsafe(1);

const SeatedServer = reviewServerWith(
  VisitorGuard.open,
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.none(), connected: 1 }),
      members: () =>
        Ref.get(members).pipe(
          Effect.map((taken) => ({ allowed: Option.some(3), taken }))
        ),
      scheduledPerMonth: () => Effect.succeed(Option.none()),
    })
  )
);

describe("a workspace that went over its plan while a post waited", () => {
  it.effect(
    "approves nothing, and says why, until it is back within its plan",
    () =>
      Effect.gen(function* overPlan() {
        const scheduling = yield* PostScheduling;
        const review = yield* PostReview;
        const links = yield* ReviewLinks;
        const visitors = yield* VisitorReview;
        const { channelId, contributor, editor, workspaceId } = yield* team;

        yield* withPolicy(workspaceId, "contributorsAndApplications");

        const { post } = yield* scheduling.schedule(contributor, {
          channelIds: [channelId],
          content: contentOf("A synthetic post that waits past a trial."),
          schedule: at8,
        });

        const { token } = yield* links.create(editor, post.id, {
          access: "approve",
          lifetime: Option.none(),
        });

        // A fourth member joins: the workspace schedules nothing now.
        yield* Ref.set(members, 4);

        const over = new PlanLimitReached({
          allowed: 3,
          limit: "members",
          needed: 4,
          used: 4,
        });

        assert.deepStrictEqual(
          yield* Effect.flip(
            review.approve(editor, post.id, yield* shown(post))
          ),
          over
        );
        assert.deepStrictEqual(
          yield* Effect.flip(
            visitors.approve(token, visitor(), yield* shown(post))
          ),
          over
        );

        // Nothing was decided: the post waits, its request too.
        assert.strictEqual(yield* statusOf(post.id), "awaitingApproval");
        assert.deepStrictEqual(
          (yield* review.thread(editor, post.id)).requests.map(
            ({ status }) => status
          ),
          ["pending"]
        );
        assert.notInclude(yield* kinds, "approved");

        // Back within its plan, the same approval goes through.
        yield* Ref.set(members, 3);

        const { late } = yield* review.approve(
          editor,
          post.id,
          yield* shown(post)
        );

        assert.isFalse(late);
        assert.strictEqual(yield* statusOf(post.id), "scheduled");
      }).pipe(Effect.provide(SeatedServer), (test) =>
        setTime(start).pipe(Effect.andThen(test))
      ),
    timeout
  );
});
