import { Context, DateTime, Effect, Layer } from "effect";

import { approvalSubject } from "#publishing/domain/approval-subject.ts";
import { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import { moveToDraft, releasePost } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

import { ApprovalGate } from "./approval-gate.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import { PublicationScheduler } from "./publication-scheduler.ts";
import { findInWorkspace, lockInWorkspace } from "./workspace-posts.ts";

// A compare and set that misses under the row lock means the lock was not
// held: a bug, not a conflict to report.
const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A post changed under its row lock");

/** A post that was approved, and what became of it. */
export interface ReleasedPost extends PostWithTargets {
  /**
   * Whether the approval came after the post's time: it then went back to
   * draft rather than out late.
   */
  readonly late: boolean;
}

/**
 * The posts that wait for an approval, for the review context, which
 * decides: it shows them to reviewers, and tells what was decided. These
 * check no permission: the review context does, before it calls them, and
 * no handler reaches them. A post is still released only while the
 * `ApprovalGate` says an approval stands for it as it is, so nothing here
 * schedules around the gate either.
 */
export class HeldPosts extends Context.Service<
  HeldPosts,
  {
    /** The workspace's post and its targets, as they are now. */
    readonly find: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<PostWithTargets, DatabaseError | PostNotFound>;
    /**
     * Schedules an approved post for the time it was asked for, and starts
     * its job. Approved after that time, it goes back to draft instead
     * (`late`), and keeps its approval: a member gives it a new time.
     */
    readonly release: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<
      ReleasedPost,
      DatabaseError | InvalidPostTransition | PostNotFound
    >;
    /** Takes a post that waits back to draft, for its author to change. */
    readonly sendBack: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | InvalidPostTransition | PostNotFound
    >;
  }
>()("peal-server/publishing/application/HeldPosts") {
  static readonly layer = Layer.effect(
    HeldPosts,
    Effect.gen(function* HeldPostsLive() {
      const posts = yield* PostRepository;
      const scheduler = yield* PublicationScheduler;
      const gate = yield* ApprovalGate;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<PostRepository>();

      const withPorts = Effect.provideContext(ports);

      const find = Effect.fn("HeldPosts.find")(function* find(
        workspaceId: WorkspaceId,
        postId: PostId
      ) {
        const { post } = yield* findInWorkspace(workspaceId, postId).pipe(
          withPorts
        );

        return { post, targets: yield* posts.targets(postId) };
      });

      const release = Effect.fn("HeldPosts.release")(function* release(
        workspaceId: WorkspaceId,
        postId: PostId
      ) {
        return yield* transaction(
          Effect.gen(function* scheduleAndStart() {
            const current = yield* lockInWorkspace(workspaceId, postId).pipe(
              withPorts
            );

            const targets = yield* posts.targets(postId);

            const released = yield* Effect.fromResult(
              releasePost(current.post, yield* DateTime.now)
            );

            const approved = yield* gate.approved({
              postId,
              subject: approvalSubject(current.post.content, targets),
              workspaceId,
            });

            if (!approved) {
              return yield* Effect.die(
                `Post ${postId} was released without an approval`
              );
            }

            yield* applied(yield* posts.update(released, current.post));

            if (released.status._tag !== "scheduled") {
              return { late: true, post: released, targets };
            }

            const executionId = yield* scheduler.schedule({
              postId,
              revision: released.scheduleRevision,
              scheduledAt: released.status.schedule.at,
            });

            yield* applied(yield* posts.setExecution(released, executionId));

            return { late: false, post: released, targets };
          })
        );
      });

      const sendBack = Effect.fn("HeldPosts.sendBack")(function* sendBack(
        workspaceId: WorkspaceId,
        postId: PostId
      ) {
        return yield* transaction(
          Effect.gen(function* moveBack() {
            const current = yield* lockInWorkspace(workspaceId, postId).pipe(
              withPorts
            );

            if (current.post.status._tag !== "awaitingApproval") {
              return yield* new InvalidPostTransition({
                action: "moveToDraft",
                from: current.post.status._tag,
                postId,
              });
            }

            const draft = yield* Effect.fromResult(moveToDraft(current.post));

            yield* applied(yield* posts.update(draft, current.post));

            return { post: draft, targets: yield* posts.targets(postId) };
          })
        );
      });

      return HeldPosts.of({ find, release, sendBack });
    })
  );
}
