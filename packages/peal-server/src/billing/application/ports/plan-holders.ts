import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Whose plan a workspace is on: its own, but for a workspace a partner
 * owns, which is on the plan of the partner's home workspace and never
 * subscribes itself.
 */
export class PlanHolders extends Context.Service<
  PlanHolders,
  {
    readonly holderOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<WorkspaceId, DatabaseError>;
  }
>()("peal-server/billing/application/PlanHolders") {
  /** For tests without partners: every workspace holds its own plan. */
  static readonly layerOwn = Layer.succeed(
    PlanHolders,
    PlanHolders.of({ holderOf: (workspaceId) => Effect.succeed(workspaceId) })
  );
}
