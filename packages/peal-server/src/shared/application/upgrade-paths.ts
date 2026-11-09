import { Context, Effect, Layer, Option } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { PlanLimit } from "#shared/domain/plan-limit.ts";
import type { PaidPlan, Plan } from "#shared/domain/plan.ts";

/** How a workspace its plan refused something gets room. */
export interface UpgradePath {
  /** The workspace's billing page, where its plan is ordered. */
  readonly billingUrl: string;
  /** The plan the workspace is on; none on a server that does not bill. */
  readonly plan: Option.Option<Plan>;
  /**
   * The smallest larger plan with room for what was refused; none on the
   * largest plan, or when no plan holds that much.
   */
  readonly planWithRoom: Option.Option<PaidPlan>;
}

const starter = (workspaceId: WorkspaceId) =>
  Effect.succeed<UpgradePath>({
    billingUrl: `http://localhost:3001/app/${workspaceId}/billing`,
    plan: Option.some("free"),
    planWithRoom: Option.some("starter"),
  });

/**
 * What to tell a workspace whose plan refused something: its plan, the
 * smallest plan that has room for `needed` of `limit`, and where to order
 * it. Every surface that answers a limit says the same from it: the API's
 * errors, the MCP tools' refusals and the sign-in service's. The billing
 * context backs it. A database failure is a defect: the refusal stands.
 */
export class UpgradePaths extends Context.Service<
  UpgradePaths,
  {
    readonly from: (
      workspaceId: WorkspaceId,
      limit: PlanLimit,
      needed: number
    ) => Effect.Effect<UpgradePath>;
    /**
     * For a workspace that must be paid for, as the one free workspace an
     * account may own: the plan to order is the smallest, or its trial's.
     */
    readonly paid: (workspaceId: WorkspaceId) => Effect.Effect<UpgradePath>;
  }
>()("peal-server/shared/application/UpgradePaths") {
  /** A free workspace offered the starter plan, for tests of other things. */
  static readonly layerTest = Layer.sync(UpgradePaths, () =>
    UpgradePaths.of({ from: starter, paid: starter })
  );
}
