import { Context, Effect, Layer, Option } from "effect";

import {
  excessesOf,
  mustReduce,
  planHolding,
} from "#billing/domain/standing.ts";
import type { Excess } from "#billing/domain/standing.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { PaidPlan, Plan } from "#shared/domain/plan.ts";

import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

/** Where a workspace stands against its plan. */
export interface Standing {
  /**
   * Whether it must come back within its plan before anything else: it
   * holds more channels or members than the plan allows, and schedules and
   * publishes nothing until it does.
   */
  readonly mustReduce: boolean;
  /** What it holds beyond its plan; nothing on a server that does not bill. */
  readonly over: readonly Excess[];
  /** None on a server that does not bill. */
  readonly plan: Option.Option<Plan>;
  /**
   * The smallest plan that holds everything it has, when it is over its
   * own; none when it is within it, or past the largest plan.
   */
  readonly planWithRoom: Option.Option<PaidPlan>;
  /** The posts scheduled to go out this month (UTC), which wait on it. */
  readonly scheduledPosts: number;
}

/**
 * Where the actor's workspace stands against its plan, for every member:
 * when a plan shrinks under a workspace, as when its trial ends or its
 * subscription is cancelled or left unpaid, nothing is deleted, so it can
 * hold more than the plan allows. Each member is told on entering it, and
 * those who manage billing order a larger plan or choose what stays
 * (`ReduceWorkspace`). Counts only: it checks no permission beyond
 * membership, which the API did.
 */
export class WorkspaceStanding extends Context.Service<
  WorkspaceStanding,
  {
    readonly of: (actor: Actor) => Effect.Effect<Standing, DatabaseError>;
  }
>()("peal-server/billing/application/WorkspaceStanding") {
  static readonly layer = Layer.effect(
    WorkspaceStanding,
    Effect.gen(function* WorkspaceStandingLive() {
      const entitlements = yield* WorkspaceEntitlements;
      const usage = yield* WorkspaceUsage;

      const of = Effect.fn("WorkspaceStanding.of")(function* of(actor: Actor) {
        const [current, used] = yield* Effect.all(
          [entitlements.of(actor.workspaceId), usage.of(actor.workspaceId)],
          { concurrency: "unbounded" }
        );

        const over = excessesOf(current.allowances, used);

        const standing: Standing = {
          mustReduce: mustReduce(over),
          over,
          plan: current.plan,
          planWithRoom: over.length === 0 ? Option.none() : planHolding(used),
          scheduledPosts: used.scheduledPosts.used,
        };

        return standing;
      });

      return WorkspaceStanding.of({ of });
    })
  );
}
