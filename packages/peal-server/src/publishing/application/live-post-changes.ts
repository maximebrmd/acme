import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import {
  livePostChangePermission,
  removable,
  requestUnpublish,
} from "#publishing/domain/live-post-change.ts";
import type {
  LivePostChange,
  LivePostRefusal,
} from "#publishing/domain/live-post-change.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { LivePostChangeStore } from "./live-post-change-store.ts";
import { LivePostHolds } from "./live-post-holds.ts";
import { LivePostJobs } from "./live-post-jobs.ts";
import { LivePostNotChangeable } from "./live-post-not-changeable.ts";
import { PlatformCredentials } from "./platform-credentials.ts";
import { PostNotFound } from "./post-not-found.ts";
import { PostOrigins } from "./post-origins.ts";
import { PostRepository } from "./post-repository.ts";
import { findInWorkspace, lockInWorkspace } from "./workspace-posts.ts";

type Failure =
  | DatabaseError
  | LivePostNotChangeable
  | MissingPermission
  | PostNotFound;

/** A target of the post that could not be unpublished, and why. */
export interface TargetRefusal {
  readonly reason: LivePostRefusal;
  readonly targetId: PostTargetId;
}

/** What asking to unpublish a whole post made, target by target. */
export interface PostUnpublish {
  readonly changes: readonly LivePostChange[];
  readonly refused: readonly TargetRefusal[];
}

/**
 * Changes members, keys and applications ask of posts that are live:
 * deleting them from the platforms (`unpublish`). Each needs
 * `livePostChangePermission`, and is refused, before anything is called,
 * where the target is not live, Peal has no id for a part of it, the
 * platform cannot (`#publishing/domain/live-post-support.ts`), another
 * change is pending, the channel cannot be used, or a boost shows the post.
 * A change is saved with its job in one transaction, under the post's and
 * the target's locks; the job deletes the parts, the last first. A target
 * that is not the post's, and a post that is not the workspace's, are
 * PostNotFound.
 */
export class LivePostChanges extends Context.Service<
  LivePostChanges,
  {
    /** Deletes the post from one channel's platform, every part of it. */
    readonly unpublishTarget: (
      actor: Actor,
      postId: PostId,
      targetId: PostTargetId
    ) => Effect.Effect<LivePostChange, Failure>;
    /**
     * Deletes the post from every channel where it can be, and answers,
     * target by target, the change made or why none could be.
     */
    readonly unpublishPost: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      PostUnpublish,
      DatabaseError | MissingPermission | PostNotFound
    >;
    /** The post's changes, newest first. Needs post:read. */
    readonly list: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      readonly LivePostChange[],
      DatabaseError | MissingPermission | PostNotFound
    >;
  }
>()("peal-server/publishing/application/LivePostChanges") {
  static readonly layer = Layer.effect(
    LivePostChanges,
    Effect.gen(function* LivePostChangesLive() {
      const posts = yield* PostRepository;
      const store = yield* LivePostChangeStore;
      const holds = yield* LivePostHolds;
      const jobs = yield* LivePostJobs;
      const credentials = yield* PlatformCredentials;
      const origins = yield* PostOrigins;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ids | PostRepository>();

      // The channel's platform, while it can be used: none once it was
      // disconnected, turned off, or must be reconnected.
      const platformOf = (target: PostTarget) =>
        credentials.account(target.channelId).pipe(
          Effect.map(({ platform }) => Option.some(platform)),
          Effect.catchTags({
            BadRequest: () => Effect.succeedNone,
            // The channels context could not read the channel: the
            // server's own failure, not the channel's.
            PlatformUnavailable: (failure) => Effect.die(failure),
            TokenExpired: () => Effect.succeedNone,
          })
        );

      // Why the locked target cannot be unpublished, or the change that
      // will, saved and started.
      const unpublishLocked = Effect.fn("LivePostChanges.unpublishLocked")(
        function* unpublishLocked(
          actor: Actor,
          post: Post,
          target: PostTarget
        ) {
          const latest = yield* store.latestOf(target.id);
          const platform = yield* platformOf(target);

          const parts = removable(target, platform, latest);

          if (Result.isFailure(parts)) {
            return Result.fail<LivePostRefusal>(parts.failure);
          }

          const held = yield* holds.ofTarget({
            postId: post.id,
            targetId: target.id,
            workspaceId: post.workspaceId,
          });

          if (Option.isSome(held)) {
            return Result.fail<LivePostRefusal>(held.value);
          }

          const change = requestUnpublish({
            channelId: target.channelId,
            id: yield* newId(LivePostChangeIdSchema).pipe(
              Effect.provideContext(ports)
            ),
            now: yield* DateTime.now,
            parts: parts.success,
            postId: post.id,
            requestedBy:
              actor.subject._tag === "user"
                ? Option.some(actor.subject.userId)
                : Option.none(),
            requestedVia: Option.some(yield* origins.of(actor)),
            targetId: target.id,
            workspaceId: post.workspaceId,
          });

          if (!(yield* store.insert(change))) {
            return Result.fail<LivePostRefusal>("changeInProgress");
          }

          yield* jobs.start(change.id);

          return Result.succeed(change);
        }
      );

      const unpublishTarget = Effect.fn("LivePostChanges.unpublishTarget")(
        function* unpublishTarget(
          actor: Actor,
          postId: PostId,
          targetId: PostTargetId
        ) {
          yield* Effect.fromResult(authorize(actor, livePostChangePermission));

          return yield* transaction(
            Effect.gen(function* inTransaction() {
              // The post, then its target, as every use case locks them.
              const { post } = yield* lockInWorkspace(
                actor.workspaceId,
                postId
              ).pipe(Effect.provideContext(ports));

              const target = yield* posts.lockTarget(targetId);

              if (Option.isNone(target) || target.value.postId !== postId) {
                return yield* new PostNotFound({ postId });
              }

              const made = yield* unpublishLocked(actor, post, target.value);

              return yield* Result.match(made, {
                onFailure: (reason) =>
                  Effect.fail(new LivePostNotChangeable({ reason, targetId })),
                onSuccess: Effect.succeed,
              });
            })
          );
        }
      );

      const unpublishPost = Effect.fn("LivePostChanges.unpublishPost")(
        function* unpublishPost(actor: Actor, postId: PostId) {
          yield* Effect.fromResult(authorize(actor, livePostChangePermission));

          return yield* transaction(
            Effect.gen(function* inTransaction() {
              const { post } = yield* lockInWorkspace(
                actor.workspaceId,
                postId
              ).pipe(Effect.provideContext(ports));

              const changes: LivePostChange[] = [];
              const refused: TargetRefusal[] = [];

              for (const target of yield* posts.lockTargets(postId)) {
                const made = yield* unpublishLocked(actor, post, target);

                if (Result.isSuccess(made)) {
                  changes.push(made.success);
                } else {
                  refused.push({ reason: made.failure, targetId: target.id });
                }
              }

              const answer: PostUnpublish = { changes, refused };

              return answer;
            })
          );
        }
      );

      const list = Effect.fn("LivePostChanges.list")(function* list(
        actor: Actor,
        postId: PostId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        yield* findInWorkspace(actor.workspaceId, postId).pipe(
          Effect.provideContext(ports)
        );

        return yield* store.ofPost(actor.workspaceId, postId);
      });

      return LivePostChanges.of({ list, unpublishPost, unpublishTarget });
    })
  );
}
