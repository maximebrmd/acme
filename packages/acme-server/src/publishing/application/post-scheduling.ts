import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { cancelTarget, createTarget } from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import {
  cancelPost,
  createDraft,
  schedulePost,
} from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { ScheduleInPast } from "#publishing/domain/schedule-in-past.ts";
import type { Schedule } from "#publishing/domain/schedule.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

import { PostNotFound } from "./post-not-found.ts";
import { PostRepository } from "./post-repository.ts";
import type { StoredPost } from "./post-repository.ts";
import { PublicationScheduler } from "./publication-scheduler.ts";

// A compare and set that misses under the row lock means the lock was not
// held: a bug, not a conflict to report.
const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A post changed under its row lock");

const scheduleOf = (post: Post) =>
  post.status._tag === "scheduled"
    ? Effect.succeed(post.status.schedule)
    : Effect.die(`Post ${post.id} is ${post.status._tag}, not scheduled`);

/** A new post for some channels, at a time. */
export interface SchedulePostRequest {
  // At least one; a channel listed twice gets one target.
  readonly channelIds: readonly [ChannelId, ...ChannelId[]];
  readonly schedule: Schedule;
  readonly workspaceId: WorkspaceId;
}

/**
 * Scheduling posts: create one for a time, move it, cancel it. Each use case
 * changes the post and starts or stops its job in one transaction, so a post
 * is scheduled exactly when its job exists.
 */
export class PostScheduling extends Context.Service<
  PostScheduling,
  {
    /** Creates a post scheduled on the given channels. */
    readonly schedule: (
      request: SchedulePostRequest
    ) => Effect.Effect<Post, DatabaseError | ScheduleInPast>;
    /**
     * Moves a scheduled post, or schedules a draft. The job for the old time
     * is stopped and one for the new time started; "publish now" is a move to
     * the current time, which a time read a moment earlier still is (see
     * `scheduleGrace`).
     */
    readonly reschedule: (
      postId: PostId,
      schedule: Schedule
    ) => Effect.Effect<
      Post,
      DatabaseError | InvalidPostTransition | PostNotFound | ScheduleInPast
    >;
    /**
     * Cancels a post. Once it is publishing, the post itself finishes with
     * whatever its channels did: a channel not yet sent is cancelled, one
     * waiting to try again makes no further attempt, and a call in flight
     * still counts.
     */
    readonly cancel: (
      postId: PostId
    ) => Effect.Effect<
      Post,
      DatabaseError | InvalidPostTransition | PostNotFound
    >;
  }
>()("acme-server/publishing/application/PostScheduling") {
  static readonly layer = Layer.effect(
    PostScheduling,
    Effect.gen(function* PostSchedulingLive() {
      const posts = yield* PostRepository;
      const scheduler = yield* PublicationScheduler;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Ids;

      const withIds = Effect.provideService(Ids, ids);

      const stored = (postId: PostId) =>
        posts.lock(postId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new PostNotFound({ postId })),
              onSome: Effect.succeed,
            })
          )
        );

      // Starts the job for the post's current revision, at the time it was
      // scheduled for (which may be later than asked), and records it.
      const startJob = Effect.fn("PostScheduling.startJob")(function* startJob(
        post: Post
      ) {
        const { at } = yield* scheduleOf(post);

        const executionId = yield* scheduler.schedule({
          postId: post.id,
          revision: post.scheduleRevision,
          scheduledAt: at,
        });

        yield* applied(yield* posts.setExecution(post, executionId));
      });

      const stopJob = ({ execution }: StoredPost) =>
        Option.match(execution, {
          onNone: () => Effect.void,
          onSome: scheduler.cancel,
        });

      const cancelTargets = Effect.fn("PostScheduling.cancelTargets")(
        function* cancelTargets(postId: PostId, now: DateTime.Utc) {
          const targets = yield* posts.lockTargets(postId);

          yield* Effect.forEach(
            targets,
            (target: PostTarget) =>
              Result.match(cancelTarget(target, now), {
                // A settled target stays as it ended.
                onFailure: () => Effect.void,
                onSuccess: (cancelled) =>
                  posts
                    .updateTarget(cancelled, target)
                    .pipe(Effect.flatMap(applied)),
              }),
            { discard: true }
          );
        }
      );

      const schedule = Effect.fn("PostScheduling.schedule")(function* schedule({
        channelIds,
        schedule: at,
        workspaceId,
      }: SchedulePostRequest) {
        const now = yield* DateTime.now;
        const postId = yield* newId(PostIdSchema).pipe(withIds);

        // A new draft can always be scheduled.
        const post = yield* Effect.fromResult(
          schedulePost(createDraft(postId, workspaceId), at, now)
        ).pipe(Effect.catchTag("InvalidPostTransition", Effect.die));

        const targets = yield* Effect.forEach(
          [...new Set(channelIds)],
          (channelId) =>
            newId(PostTargetIdSchema).pipe(
              withIds,
              Effect.map((targetId) =>
                createTarget(targetId, postId, channelId)
              )
            )
        );

        yield* transaction(
          Effect.gen(function* insertAndStart() {
            yield* posts.insert(post, targets);
            yield* startJob(post);
          })
        );

        return post;
      });

      const reschedule = Effect.fn("PostScheduling.reschedule")(
        function* reschedule(postId: PostId, at: Schedule) {
          return yield* transaction(
            Effect.gen(function* moveAndRestart() {
              const current = yield* stored(postId);
              const now = yield* DateTime.now;

              const moved = yield* Effect.fromResult(
                schedulePost(current.post, at, now)
              );

              yield* applied(yield* posts.update(moved, current.post));
              yield* stopJob(current);
              yield* startJob(moved);

              return moved;
            })
          );
        }
      );

      const cancel = Effect.fn("PostScheduling.cancel")(function* cancel(
        postId: PostId
      ) {
        return yield* transaction(
          Effect.gen(function* cancelAndStop() {
            const current = yield* stored(postId);
            const now = yield* DateTime.now;

            // The job already woke: it finishes with the targets it sent.
            if (current.post.status._tag === "publishing") {
              yield* cancelTargets(postId, now);

              return current.post;
            }

            const cancelled = yield* Effect.fromResult(
              cancelPost(current.post, now)
            );

            yield* applied(yield* posts.update(cancelled, current.post));
            yield* cancelTargets(postId, now);
            yield* stopJob(current);

            return cancelled;
          })
        );
      });

      return PostScheduling.of({ cancel, reschedule, schedule });
    })
  );
}
