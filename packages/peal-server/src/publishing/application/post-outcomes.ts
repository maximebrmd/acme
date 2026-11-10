import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Semaphore,
} from "effect";

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

/**
 * How many requests wait at once in one process: each reads the post twice
 * a second, and a client may open as many as it likes.
 */
export const maxWaitingRequests = 100;

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

const untilSettled = Effect.fn("PostOutcomes.untilSettled")(
  function* untilSettled(
    actor: Actor,
    postId: PostId,
    wait: Duration.Duration
  ) {
    const posts = yield* PostRepository;

    const deadline = DateTime.addDuration(
      yield* DateTime.now,
      Duration.min(wait, maxOutcomeWait)
    );

    for (;;) {
      const { post } = yield* findInWorkspace(actor.workspaceId, postId);
      const targets = yield* posts.targets(postId);
      const now = yield* DateTime.now;

      if (
        DateTime.isGreaterThanOrEqualTo(now, deadline) ||
        !mayChangeBy(post, deadline)
      ) {
        const awaited: AwaitedPost = {
          post,
          settled: post.status._tag === "finished",
          targets,
        };

        return awaited;
      }

      yield* Effect.sleep(
        Duration.min(readEvery, DateTime.distance(now, deadline))
      );
    }
  }
);

/**
 * Waiting for a post to go out, for a client that wants the outcome in the
 * answer to its request. Nothing here publishes: the post's durable job
 * does, as for any post, and this only reads the post again, every half
 * second, until it has finished or the time is up. Each read is a query of
 * its own, so no transaction, row lock or advisory lock is held while
 * waiting. A process lets `maxWaitingRequests` wait at once: one more is
 * answered at once with the post as it stands, as when its time ran out,
 * and its client asks again. Needs post:read.
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
    /**
     * A post just made, waited for as `await` waits, for whoever made it
     * and asked to wait in the same request. Making it is done and cannot
     * be answered an error any more: when the wait is refused (someone who
     * sends posts and may not read them, a post deleted meanwhile), the
     * post as it was made, and no wait at all for none asked.
     */
    readonly afterSending: (
      actor: Actor,
      sent: PostWithTargets,
      wait: Duration.Duration
    ) => Effect.Effect<PostWithTargets, DatabaseError>;
  }
>()("peal-server/publishing/application/PostOutcomes") {}

/** The use case, letting `waiters` requests wait at once. */
export const makePostOutcomes = (waiters: number) =>
  Effect.gen(function* PostOutcomesLive() {
    const ports = yield* Effect.context<PostRepository>();
    const waiting = yield* Semaphore.make(waiters);

    const awaitOutcome = Effect.fn("PostOutcomes.await")(function* awaiting(
      actor: Actor,
      postId: PostId,
      wait: Duration.Duration
    ) {
      yield* Effect.fromResult(authorize(actor, "post:read"));

      const room = yield* waiting
        .withPermitsIfAvailable(1)(untilSettled(actor, postId, wait))
        .pipe(Effect.provideContext(ports));

      // No room to wait: the post as it stands.
      return yield* Option.match(room, {
        onNone: () =>
          untilSettled(actor, postId, Duration.zero).pipe(
            Effect.provideContext(ports)
          ),
        onSome: (awaited) => Effect.succeed(awaited),
      });
    });

    const afterSending = (
      actor: Actor,
      sent: PostWithTargets,
      wait: Duration.Duration
    ): Effect.Effect<PostWithTargets, DatabaseError> =>
      Duration.isZero(wait)
        ? Effect.succeed(sent)
        : awaitOutcome(actor, sent.post.id, wait).pipe(
            Effect.catchTags({
              MissingPermission: () => Effect.succeed(sent),
              PostNotFound: () => Effect.succeed(sent),
            })
          );

    return PostOutcomes.of({ afterSending, await: awaitOutcome });
  });

/** The use case as the server runs it. */
export const PostOutcomesLive = Layer.effect(
  PostOutcomes,
  makePostOutcomes(maxWaitingRequests)
);
