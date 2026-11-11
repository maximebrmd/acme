import { Context, Effect, Layer, Option } from "effect";

import type { LivePostRefusal } from "#publishing/domain/live-post-change.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What other contexts hold a live post for, so that it is not changed:
 * a boost that is not over shows it (the ads context), and deleting it
 * would leave an ad spending on a post that is gone.
 */
export class LivePostHolds extends Context.Service<
  LivePostHolds,
  {
    /** Why the target may not be changed now; none when nothing holds it. */
    readonly ofTarget: (target: {
      readonly postId: PostId;
      readonly targetId: PostTargetId;
      readonly workspaceId: WorkspaceId;
    }) => Effect.Effect<
      Option.Option<Extract<LivePostRefusal, "boostRunning">>,
      DatabaseError
    >;
  }
>()("peal-server/publishing/application/LivePostHolds") {
  /** Nothing holds any post. */
  static readonly none = Layer.succeed(
    LivePostHolds,
    LivePostHolds.of({ ofTarget: () => Effect.succeed(Option.none()) })
  );
}
