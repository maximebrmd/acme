import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The workspaces whose holdings count against one plan's allowances with
 * a workspace's own: its pool. A partner's home workspace and the
 * workspaces the partner owns (the partner rule first), else, on a server
 * that bills, the other workspaces of its billing account. The one place
 * the pool's hold is taken, so no context chooses.
 */
export class PlanPools extends Context.Service<
  PlanPools,
  {
    /**
     * The other workspaces of the workspace's pool. In a transaction, the
     * pool stays held until it ends (the partner's hold, or the billing
     * account's), so two of its workspaces adding at once never pass a
     * limit together: take it after the workspace's own lock, as the
     * workspace context's lock order says.
     */
    readonly sharedWith: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly WorkspaceId[], DatabaseError>;
    /**
     * The same, for each of these workspaces at once, without holding
     * anything: for reports of how workspaces stand, never to count and
     * then add. One that shares its pool with none is left out.
     */
    readonly sharingIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, readonly WorkspaceId[]>,
      DatabaseError
    >;
  }
>()("peal-server/billing/application/PlanPools") {
  /** Every workspace alone in its pool: for tests without pools. */
  static readonly layerAlone = Layer.succeed(
    PlanPools,
    PlanPools.of({
      sharedWith: () => Effect.succeed([]),
      sharingIn: () => Effect.succeed(new Map()),
    })
  );
}
