import { Context, Effect, Layer } from "effect";

import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Hears what members do to a post's schedule, for whoever follows a
 * workspace from outside (its webhook endpoints). Publishing calls it in
 * the transaction that changes the post, so what it records commits with
 * the change or not at all. How each target ends is told to
 * PublicationOutcomes.
 */
export class PostEvents extends Context.Service<
  PostEvents,
  {
    /** The post was scheduled, or moved to another time, on these targets. */
    readonly scheduled: (
      post: Post,
      targets: readonly PostTarget[]
    ) => Effect.Effect<void, DatabaseError>;
    /** The scheduled post was taken back to draft. */
    readonly unscheduled: (post: Post) => Effect.Effect<void, DatabaseError>;
    /** The post was cancelled: `targets` are those cancelled with it. */
    readonly cancelled: (
      post: Post,
      targets: readonly PostTarget[]
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * A member said what became of an unconfirmed target: `target` as they
     * left it, published or failed.
     */
    readonly confirmed: (
      post: Post,
      target: PostTarget
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Every target of the post has its result, `targets` as they now
     * stand: told each time the post finishes, when a target sent again
     * ends its round, when a cancel leaves nothing to send, and when a
     * member's confirmation revises the outcome.
     */
    readonly finished: (
      post: Post,
      targets: readonly PostTarget[]
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/PostEvents") {
  /** Nobody follows: for tests that need none. */
  static readonly none = Layer.succeed(
    PostEvents,
    PostEvents.of({
      cancelled: () => Effect.void,
      confirmed: () => Effect.void,
      finished: () => Effect.void,
      scheduled: () => Effect.void,
      unscheduled: () => Effect.void,
    })
  );
}
