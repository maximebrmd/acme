import { Context, Effect, Layer } from "effect";

import type { LivePostChange } from "#publishing/domain/live-post-change.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Who hears how a change of a live post ended: the workspace's webhook
 * endpoints, and the contexts that follow published posts (analytics,
 * the inbox), which stop following a post removed from its platform (an
 * edit changes nothing they read).
 * Told in the transaction that settles the change; a bug in telling is
 * logged and never stops it.
 */
export class LivePostEvents extends Context.Service<
  LivePostEvents,
  {
    /** The post is off the platform: `target` has its `removedAt`. */
    readonly unpublished: (
      change: LivePostChange,
      target: PostTarget
    ) => Effect.Effect<void, DatabaseError>;
    /** The job gave up: `change` has its code and the parts left. */
    readonly unpublishFailed: (
      change: LivePostChange,
      target: PostTarget
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * The platform shows the edit's text on the part at `part`: `target`
     * has its `editedAt`.
     */
    readonly edited: (
      change: LivePostChange,
      target: PostTarget,
      part: number
    ) => Effect.Effect<void, DatabaseError>;
    /** The edit's job gave up: `change` has its code. */
    readonly editFailed: (
      change: LivePostChange,
      target: PostTarget,
      part: number
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/LivePostEvents") {
  /** Nobody hears. */
  static readonly none = Layer.succeed(
    LivePostEvents,
    LivePostEvents.of({
      editFailed: () => Effect.void,
      edited: () => Effect.void,
      unpublishFailed: () => Effect.void,
      unpublished: () => Effect.void,
    })
  );
}
