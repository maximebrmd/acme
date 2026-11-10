import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import type { Layer } from "effect";

import { HeldPosts } from "#publishing/application/held-posts.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import {
  FakeApprovalGate,
  GateLog,
} from "#test/publishing/fakes/fake-approval-gate.ts";
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
import { connect, postsServerBehind } from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
  postAllowance,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Scheduling in a workspace whose gate holds every post until it is
// approved: a held post has its time and no job, and goes out only once the
// gate says an approval stands for it.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const at8 = scheduleIn("2026-06-15T08:00:00Z");

const GatedServer = postsServerBehind(
  FakeApprovalGate,
  attachableMedia(),
  postAllowance(),
  PostEvents.none
);

const onGatedServer = <A, E>(
  test: Effect.Effect<A, E, Layer.Success<typeof GatedServer>>
) =>
  setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(GatedServer))));

const freshWorkspace = newId(WorkspaceIdSchema);

const statusOf = (postId: Parameters<typeof storedPost>[0]) =>
  storedPost(postId).pipe(Effect.map(({ post }) => post.status._tag));

describe("PostScheduling behind an ApprovalGate", () => {
  it.effect(
    "holds a new post without a job, then sends it once approved",
    () =>
      onGatedServer(
        Effect.gen(function* holdsThenSends() {
          const scheduling = yield* PostScheduling;
          const held = yield* HeldPosts;
          const gate = yield* GateLog;
          const workspaceId = yield* freshWorkspace;
          const channelId = yield* connect(workspaceId, "mastodon");

          const { post } = yield* scheduling.schedule(actorIn(workspaceId), {
            channelIds: [channelId],
            content: contentOf("A synthetic post to approve."),
            schedule: at8,
          });

          assert.strictEqual(post.status._tag, "awaitingApproval");
          assert.deepStrictEqual(yield* gate.held, [post.id]);
          assert.deepStrictEqual(
            (yield* storedPost(post.id)).execution,
            Option.none()
          );

          // Its time comes and goes for nobody while it waits.
          yield* gate.approve(post.id);

          const released = yield* held.release(workspaceId, post.id);

          assert.isFalse(released.late);
          assert.strictEqual(released.post.status._tag, "scheduled");

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(channelId), 1);
        })
      ),
    timeout
  );

  it.effect(
    "takes a post approved after its time back to draft, sending nothing",
    () =>
      onGatedServer(
        Effect.gen(function* lateApproval() {
          const scheduling = yield* PostScheduling;
          const held = yield* HeldPosts;
          const gate = yield* GateLog;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channelId = yield* connect(workspaceId, "mastodon");

          const { post } = yield* scheduling.schedule(actor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post approved late."),
            schedule: at8,
          });

          yield* setTime("2026-06-15T09:00:00Z");
          yield* gate.approve(post.id);

          const released = yield* held.release(workspaceId, post.id);

          assert.isTrue(released.late);
          assert.strictEqual(yield* statusOf(post.id), "draft");
          assert.lengthOf(yield* callsOn(channelId), 0);

          // Its approval stands: given a new time, it is scheduled.
          const again = yield* scheduling.reschedule(
            actor,
            post.id,
            scheduleIn("2026-06-15T10:00:00Z")
          );

          assert.strictEqual(again.post.status._tag, "scheduled");
        })
      ),
    timeout
  );

  it.effect(
    "asks again once an approved post says something else",
    () =>
      onGatedServer(
        Effect.gen(function* editVoids() {
          const scheduling = yield* PostScheduling;
          const drafts = yield* PostDrafts;
          const held = yield* HeldPosts;
          const gate = yield* GateLog;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channelId = yield* connect(workspaceId, "mastodon");

          const { post } = yield* scheduling.schedule(actor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post, first wording."),
            schedule: at8,
          });

          yield* gate.approve(post.id);
          yield* held.release(workspaceId, post.id);

          // Moved, it says the same: it stays scheduled.
          const moved = yield* scheduling.reschedule(
            actor,
            post.id,
            scheduleIn("2026-06-15T09:00:00Z")
          );

          assert.strictEqual(moved.post.status._tag, "scheduled");

          yield* scheduling.unschedule(actor, post.id);
          yield* drafts.update(actor, post.id, {
            channelIds: [channelId],
            content: contentOf("A synthetic post, second wording."),
          });

          const edited = yield* scheduling.reschedule(actor, post.id, at8);

          assert.strictEqual(edited.post.status._tag, "awaitingApproval");

          // Its time passes, and nothing goes out.
          yield* setTime("2026-06-15T08:30:00Z");
          yield* settle();

          assert.strictEqual(yield* statusOf(post.id), "awaitingApproval");
          assert.lengthOf(yield* callsOn(channelId), 0);
        })
      ),
    timeout
  );

  it.effect(
    "refuses to release a post nobody approved",
    () =>
      onGatedServer(
        Effect.gen(function* notApproved() {
          const scheduling = yield* PostScheduling;
          const held = yield* HeldPosts;
          const workspaceId = yield* freshWorkspace;
          const channelId = yield* connect(workspaceId, "mastodon");

          const { post } = yield* scheduling.schedule(actorIn(workspaceId), {
            channelIds: [channelId],
            content: contentOf("A synthetic post nobody approved."),
            schedule: at8,
          });

          const exit = yield* Effect.exit(held.release(workspaceId, post.id));

          assert.isTrue(exit._tag === "Failure");
          assert.strictEqual(yield* statusOf(post.id), "awaitingApproval");
        })
      ),
    timeout
  );

  it.effect(
    "tells the gate when a post that waits is taken back or cancelled",
    () =>
      onGatedServer(
        Effect.gen(function* withdraws() {
          const scheduling = yield* PostScheduling;
          const gate = yield* GateLog;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channelId = yield* connect(workspaceId, "mastodon");

          const request = {
            channelIds: [channelId] as const,
            content: contentOf("A synthetic post taken back."),
            schedule: at8,
          };

          const first = yield* scheduling.schedule(actor, request);
          const second = yield* scheduling.schedule(actor, request);

          const draft = yield* scheduling.unschedule(actor, first.post.id);
          const cancelled = yield* scheduling.cancel(actor, second.post.id);

          assert.strictEqual(draft.post.status._tag, "draft");
          assert.strictEqual(cancelled.post.status._tag, "cancelled");
          assert.deepStrictEqual(yield* gate.withdrawn, [
            first.post.id,
            second.post.id,
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "lets someone who only writes drafts ask, and act on what waits only",
    () =>
      onGatedServer(
        Effect.gen(function* contributorAsks() {
          const scheduling = yield* PostScheduling;
          const held = yield* HeldPosts;
          const gate = yield* GateLog;
          const workspaceId = yield* freshWorkspace;
          const channelId = yield* connect(workspaceId, "mastodon");

          const contributor = actorIn(
            workspaceId,
            permissionsFor("contributor")
          );

          const { post } = yield* scheduling.schedule(contributor, {
            channelIds: [channelId],
            content: contentOf("A synthetic post by a contributor."),
            schedule: at8,
          });

          assert.strictEqual(post.status._tag, "awaitingApproval");

          yield* gate.approve(post.id);
          yield* held.release(workspaceId, post.id);

          // Scheduled, it is no longer theirs to move, take back or cancel.
          for (const refused of [
            scheduling.reschedule(contributor, post.id, at8),
            scheduling.unschedule(contributor, post.id),
            scheduling.cancel(contributor, post.id),
          ]) {
            assert.deepStrictEqual(
              yield* Effect.flip(refused),
              new MissingPermission({ permission: "post:schedule" })
            );
          }

          // A viewer asks for nothing.
          assert.deepStrictEqual(
            yield* Effect.flip(
              scheduling.schedule(
                actorIn(workspaceId, permissionsFor("viewer")),
                {
                  channelIds: [channelId],
                  content: contentOf("A synthetic post by a viewer."),
                  schedule: at8,
                }
              )
            ),
            new MissingPermission({ permission: "post:schedule" })
          );
        })
      ),
    timeout
  );
});
