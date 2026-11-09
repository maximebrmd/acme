import { Context, Effect, Layer, Option } from "effect";

import type { Entitlements } from "#billing/domain/entitlements.ts";
import { planAllowances, plans } from "#billing/domain/plans.ts";
import type { Allowances } from "#billing/domain/plans.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { Plan } from "#shared/domain/plan.ts";

import type { Usage } from "./ports/workspace-usage.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

/** A plan and what it allows. */
export interface PlanOffer {
  readonly allowances: Allowances;
  readonly plan: Plan;
}

/** A workspace's plan, what it uses of it, and the plans it can move to. */
export interface Overview {
  readonly entitlements: Entitlements;
  /** Every plan, from the smallest; none on a server that does not bill. */
  readonly plans: readonly PlanOffer[];
  readonly usage: Usage;
}

const offers: readonly PlanOffer[] = plans.map((plan) => ({
  allowances: planAllowances[plan],
  plan,
}));

/** The actor's workspace's billing, for its billing page. Needs billing:read. */
export class BillingOverview extends Context.Service<
  BillingOverview,
  {
    readonly of: (
      actor: Actor
    ) => Effect.Effect<Overview, DatabaseError | MissingPermission>;
  }
>()("peal-server/billing/application/BillingOverview") {
  static readonly layer = Layer.effect(
    BillingOverview,
    Effect.gen(function* BillingOverviewLive() {
      const entitlements = yield* WorkspaceEntitlements;
      const usage = yield* WorkspaceUsage;

      const of = Effect.fn("BillingOverview.of")(function* of(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "billing:read"));

        const [current, used] = yield* Effect.all(
          [entitlements.of(actor.workspaceId), usage.of(actor.workspaceId)],
          { concurrency: "unbounded" }
        );

        const overview: Overview = {
          entitlements: current,
          plans: Option.isSome(current.plan) ? offers : [],
          usage: used,
        };

        return overview;
      });

      return BillingOverview.of({ of });
    })
  );
}
