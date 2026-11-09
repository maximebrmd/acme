import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { InvalidTargetTransition } from "#publishing/domain/invalid-target-transition.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import {
  confirmNotPublished,
  confirmPublished,
  repostTarget,
} from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { reopenPost, reviseOutcome } from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { PostNotFound } from "./post-not-found.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import { PublicationOutcomes } from "./publication-outcomes.ts";
import { PublicationScheduler } from "./publication-scheduler.ts";
import { lockInWorkspace } from "./workspace-posts.ts";

/** What a member found on the platform for an unconfirmed target. */
export type Confirmation =
  // The post is live there, at `permalink` when the member gave it.
  | { readonly _tag: "published"; readonly permalink: Option.Option<string> }
  // The post is not there.
  | { readonly _tag: "notPublished" };

type Failure =
  | DatabaseError
  | InvalidPostTransition
  | InvalidTargetTransition
  | MissingPermission
  | PostNotFound;

// A compare and set that misses under the row lock means the lock was not
// held: a bug, not a conflict to report.
const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A post changed under its row lock");

/**
 * What members do once a post went out on a channel and did not plainly
 * succeed: repost a target that failed or may not have gone out, which sends
 * it again in a new round, or say whether an unconfirmed one went out. Both
 * need post:schedule, and clear what asked members to check the target
 * (PublicationOutcomes.resolved).
 *
 * A target is only found in its post, and the post in the workspace that
 * owns it: anything else is PostNotFound.
 */
export class PostFollowUp extends Context.Service<
  PostFollowUp,
  {
    /**
     * Sends a failed or unconfirmed target again, at once, in its next
     * round. A finished post is publishing again until that round settles.
     */
    readonly repost: (
      actor: Actor,
      postId: PostId,
      targetId: PostTargetId
    ) => Effect.Effect<PostWithTargets, Failure>;
    /**
     * Records what the member found on the platform for an unconfirmed
     * target: published, when its attempt was made, or failed, and the
     * post's outcome follows.
     */
    readonly confirm: (
      actor: Actor,
      postId: PostId,
      targetId: PostTargetId,
      confirmation: Confirmation
    ) => Effect.Effect<PostWithTargets, Failure>;
  }
>()("peal-server/publishing/application/PostFollowUp") {
  static readonly layer = Layer.effect(
    PostFollowUp,
    Effect.gen(function* PostFollowUpLive() {
      const posts = yield* PostRepository;
      const outcomes = yield* PublicationOutcomes;
      const scheduler = yield* PublicationScheduler;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<PostRepository>();

      // The post, then its target, both locked until the transaction ends.
      const lockBoth = Effect.fn("PostFollowUp.lockBoth")(function* lockBoth(
        actor: Actor,
        postId: PostId,
        targetId: PostTargetId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:schedule"));

        const { post } = yield* lockInWorkspace(actor.workspaceId, postId).pipe(
          Effect.provideContext(ports)
        );

        const target = yield* posts.lockTarget(targetId);

        if (Option.isNone(target) || target.value.postId !== postId) {
          return yield* new PostNotFound({ postId });
        }

        return { post, target: target.value };
      });

      const saveTarget = (next: PostTarget, current: PostTarget) =>
        posts.updateTarget(next, current).pipe(Effect.flatMap(applied));

      const savePost = (next: Post, current: Post) =>
        next === current
          ? Effect.void
          : posts.update(next, current).pipe(Effect.flatMap(applied));

      const repost = Effect.fn("PostFollowUp.repost")(function* repost(
        actor: Actor,
        postId: PostId,
        targetId: PostTargetId
      ) {
        return yield* transaction(
          Effect.gen(function* sendAgain() {
            const { post, target } = yield* lockBoth(actor, postId, targetId);
            const next = yield* Effect.fromResult(repostTarget(target));

            const reopened = yield* Effect.fromResult(
              reopenPost(post, yield* DateTime.now)
            );

            yield* saveTarget(next, target);
            yield* savePost(reopened, post);
            yield* outcomes.resolved(target);
            yield* scheduler.repost({ round: next.round, targetId });

            return { post: reopened, targets: yield* posts.targets(postId) };
          })
        );
      });

      const confirm = Effect.fn("PostFollowUp.confirm")(function* confirm(
        actor: Actor,
        postId: PostId,
        targetId: PostTargetId,
        confirmation: Confirmation
      ) {
        return yield* transaction(
          Effect.gen(function* record() {
            const { post, target } = yield* lockBoth(actor, postId, targetId);
            const now = yield* DateTime.now;

            const next = yield* Effect.fromResult(
              confirmation._tag === "published"
                ? confirmPublished(
                    target,
                    Option.none(),
                    confirmation.permalink
                  )
                : confirmNotPublished(target, now)
            );

            yield* saveTarget(next, target);

            const targets = yield* posts.targets(postId);

            // A post still publishing finishes when its last target does.
            const revised =
              post.status._tag === "finished"
                ? yield* Effect.fromResult(reviseOutcome(post, targets))
                : post;

            yield* savePost(revised, post);
            yield* outcomes.resolved(target);

            return { post: revised, targets };
          })
        );
      });

      return PostFollowUp.of({ confirm, repost });
    })
  );
}
