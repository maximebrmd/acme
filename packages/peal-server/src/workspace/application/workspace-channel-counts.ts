import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many channels workspaces have connected, which the channels context
 * counts: for the lists of a partner's workspaces and its daily usage.
 */
export class WorkspaceChannelCounts extends Context.Service<
  WorkspaceChannelCounts,
  {
    /** Each workspace's count; one without channels may be left out. */
    readonly of: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
  }
>()("peal-server/workspace/application/WorkspaceChannelCounts") {
  /** For tests: the counts given, zero for any other workspace. */
  static readonly layerTest = (counts: ReadonlyMap<WorkspaceId, number>) =>
    Layer.succeed(
      WorkspaceChannelCounts,
      WorkspaceChannelCounts.of({ of: () => Effect.succeed(counts) })
    );
}
