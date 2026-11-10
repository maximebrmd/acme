import { Context, DateTime, Duration, Effect, Layer } from "effect";

import type { Post } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import type { PostNotFound } from "./post-not-found.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import { findInWorkspace } from "./workspace-posts.ts";

/** The longest a request waits for a post's outcome. */
export const maxOutcomeWait = Duration.seconds(60);

// How often a waiting request reads the post again.
const readEvery = Duration.millis(500);

/** A post as a wait left it. */
export interface AwaitedPost extends PostWithTargets {
  /**
   * Whether the post has finished: every channel has its result. False
   * when the time ran out first, or when nothing will happen in it.
   */
  readonly settled: boolean;
}

// Whether waiting until `deadline` can see the post change: it is
// publishing, or scheduled for a time that comes first.
const mayChangeBy = (post: Post, deadline: DateTime.Utc): boolean =>
  post.status._tag === "publishing" ||
  (post.status._tag === "scheduled" &&
    DateTime.isLessThanOrEqualTo(post.status.schedule.at, deadline));

/**
 * Waiting for a post to go out, for a client that wants the outcome in the
 * answer to its request. Nothing here publishes: the post's durable job
 * does, as for any post, and this only reads the post again, every half
 * second, until it has finished or the time is up. Each read is a query of
 * its own, so no transaction, row lock or advisory lock is held while
 * waiting, and a request that waits costs one idle connection to its
 * client and nothing else. Needs post:read.
 */
export class PostOutcomes extends Context.Service<
  PostOutcomes,
  {
    /**
     * The post once it has finished, or as it stands after `wait`
     * (`maxOutcomeWait` at most): each channel published, with its
     * address, failed, with its reason, or still going. A draft, a
     * cancelled post and a post scheduled for later than the wait are
     * answered at once.
     */
    readonly await: (
      actor: Actor,
      postId: PostId,
      wait: Duration.Duration
    ) => Effect.Effect<
      AwaitedPost,
      DatabaseError | MissingPermission | PostNotFound
    >;
  }
>()("peal-server/publishing/application/PostOutcomes") {
  static readonly layer = Layer.effect(
    PostOutcomes,
    Effect.gen(function* PostOutcomesLive() {
      const posts = yield* PostRepository;
      const ports = yield* Effect.context<PostRepository>();

      const read = Effect.fn("PostOutcomes.read")(function* read(
        actor: Actor,
        postId: PostId
      ) {
        const { post } = yield* findInWorkspace(actor.workspaceId, postId).pipe(
          Effect.provideContext(ports)
        );

        return { post, targets: yield* posts.targets(postId) };
      });

      const awaitOutcome = Effect.fn("PostOutcomes.await")(function* awaiting(
        actor: Actor,
        postId: PostId,
        wait: Duration.Duration
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const deadline = DateTime.addDuration(
          yield* DateTime.now,
          Duration.min(wait, maxOutcomeWait)
        );

        for (;;) {
          const current = yield* read(actor, postId);
          const now = yield* DateTime.now;

          if (
            DateTime.isGreaterThanOrEqualTo(now, deadline) ||
            !mayChangeBy(current.post, deadline)
          ) {
            const awaited: AwaitedPost = {
              ...current,
              settled: current.post.status._tag === "finished",
            };

            return awaited;
          }

          yield* Effect.sleep(
            Duration.min(readEvery, DateTime.distance(now, deadline))
          );
        }
      });

      return PostOutcomes.of({ await: awaitOutcome });
    })
  );
}
