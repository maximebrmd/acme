import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  excessesOf,
  mustReduce,
  planHolding,
} from "#billing/domain/standing.ts";
import type { Excess } from "#billing/domain/standing.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { PaidPlan, Plan } from "#shared/domain/plan.ts";

import { BillingMode, inGrace } from "./ports/billing-mode.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

/** Where a workspace stands against its plan. */
export interface Standing {
  /**
   * Until when a workspace on the free tier over its accounts still
   * schedules and publishes (PEAL_BILLING_GRACE_UNTIL), while it is; none
   * otherwise. It connects nothing more meanwhile.
   */
  readonly graceUntil: Option.Option<DateTime.Utc>;
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
    /** Whether this server bills: none of the others limits anything. */
    readonly bills: boolean;
    readonly of: (actor: Actor) => Effect.Effect<Standing, DatabaseError>;
    /**
     * Those of these workspaces for which `of` answers `mustReduce`, for
     * views across workspaces: a few reads whatever their number (the
     * plans' holders and their subscriptions, the pools, the channels,
     * the members), only what decides it. It holds no partner's pool, as
     * connecting a channel does: it reports a state and adds nothing, and
     * a page of workspaces would queue behind every connection. Nothing
     * on a server that does not bill. It must stay equal to `of`
     * (`test/billing/integration/standing-across-workspaces.test.ts`).
     */
    readonly overPlanIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlySet<WorkspaceId>, DatabaseError>;
  }
>()("peal-server/billing/application/WorkspaceStanding") {
  static readonly layer = Layer.effect(
    WorkspaceStanding,
    Effect.gen(function* WorkspaceStandingLive() {
      const entitlements = yield* WorkspaceEntitlements;
      const usage = yield* WorkspaceUsage;
      const { enabled, graceUntil } = yield* BillingMode;

      // Whether the grace keeps a workspace on `plan`, over it, from having
      // to reduce: only the free tier's, and only while it runs.
      const gracedAt = (plan: Option.Option<Plan>, now: DateTime.Utc) =>
        Option.contains(plan, "free") && inGrace(graceUntil, now);

      const of = Effect.fn("WorkspaceStanding.of")(function* of(actor: Actor) {
        const [current, used] = yield* Effect.all(
          [entitlements.of(actor.workspaceId), usage.of(actor.workspaceId)],
          { concurrency: "unbounded" }
        );

        const over = excessesOf(current.allowancesFor(used.channels), used);

        const graced =
          mustReduce(over) && gracedAt(current.plan, yield* DateTime.now);

        const standing: Standing = {
          graceUntil: graced ? graceUntil : Option.none(),
          mustReduce: mustReduce(over) && !graced,
          over,
          plan: current.plan,
          planWithRoom: over.length === 0 ? Option.none() : planHolding(used),
          scheduledPosts: used.scheduledPosts.used,
        };

        return standing;
      });

      const overPlanIn = Effect.fn("WorkspaceStanding.overPlanIn")(
        function* overPlanIn(workspaceIds: readonly WorkspaceId[]) {
          const plans = yield* entitlements.ofEach(workspaceIds);

          const metered = workspaceIds.filter((id) =>
            Option.isSome(plans.get(id)?.plan ?? Option.none())
          );

          if (metered.length === 0) {
            return new Set<WorkspaceId>();
          }

          const held = yield* usage.heldIn(metered);
          const now = yield* DateTime.now;

          return new Set(
            metered.filter((id) => {
              const plan = plans.get(id);
              const seated = held.get(id);

              return (
                plan !== undefined &&
                seated !== undefined &&
                !gracedAt(plan.plan, now) &&
                // Media never decides it, and is not read.
                mustReduce(
                  excessesOf(plan.allowancesFor(seated.channels), {
                    ...seated,
                    mediaStorage: 0,
                  })
                )
              );
            })
          );
        }
      );

      return WorkspaceStanding.of({ bills: enabled, of, overPlanIn });
    })
  );
}
