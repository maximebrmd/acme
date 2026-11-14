import { Context, Effect, Layer } from "effect";

import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * The likes of published targets as analytics last counted them, by
 * target: none for a target analytics does not follow, or has not read
 * yet. It only reads what was counted: never a platform call, so a rule
 * never makes a read happen, paid or not.
 */
export class FollowUpCounts extends Context.Service<
  FollowUpCounts,
  {
    readonly likesOf: (
      targetIds: readonly PostTargetId[]
    ) => Effect.Effect<ReadonlyMap<PostTargetId, number>, DatabaseError>;
  }
>()("peal-server/publishing/application/FollowUpCounts") {
  /** For tests that count nothing: no target has likes. */
  static readonly none = Layer.succeed(
    FollowUpCounts,
    FollowUpCounts.of({ likesOf: () => Effect.succeed(new Map()) })
  );
}
