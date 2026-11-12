import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import type { Entitlements } from "#billing/domain/entitlements.ts";
import {
  planAllowances,
  legacyPlans,
  trialDays,
  trialPlan,
} from "#billing/domain/plans.ts";
import type { Allowances } from "#billing/domain/plans.ts";
import { planPrices } from "#billing/domain/prices.ts";
import type { PlanPrice } from "#billing/domain/prices.ts";
import { mayWithdraw } from "#billing/domain/withdrawal.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Pseudonyms } from "#shared/application/pseudonyms.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { LegacyPlan, PaidPlan, Plan } from "#shared/domain/plan.ts";

import { trialOffered } from "./place-order.ts";
import type { MemberAddresses } from "./ports/member-addresses.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import type { Trials } from "./ports/trials.ts";
import type { Usage } from "./ports/workspace-usage.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

/** A plan, what it allows, and its prices excluding VAT, if it is paid. */
export interface PlanOffer {
  readonly allowances: Allowances;
  readonly plan: Plan;
  readonly price: Option.Option<PlanPrice>;
}

/** The trial a workspace may start. */
export interface TrialOffer {
  /** Whether this member may start it for this workspace now. */
  readonly available: boolean;
  readonly days: number;
  readonly plan: PaidPlan;
}

/** A workspace's plan, what it uses of it, and the plans it can move to. */
export interface Overview {
  readonly entitlements: Entitlements;
  /** Every plan, from the smallest; none on a server that does not bill. */
  readonly plans: readonly PlanOffer[];
  /** None on a server that does not bill. */
  readonly trial: Option.Option<TrialOffer>;
  readonly usage: Usage;
  /**
   * Until when the subscription can be withdrawn from, while a consumer
   * may (whether the customer is one is checked on withdrawing).
   */
  readonly withdrawableUntil: Option.Option<DateTime.Utc>;
}

const priceOfPlan = (plan: LegacyPlan): Option.Option<PlanPrice> =>
  plan === "free" ? Option.none() : Option.some(planPrices[plan]);

/** Every plan, with its allowances and prices. */
export const catalogue: readonly PlanOffer[] = legacyPlans.map((plan) => ({
  allowances: planAllowances[plan],
  plan,
  price: priceOfPlan(plan),
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

      const context = yield* Effect.context<
        MemberAddresses | Pseudonyms | Subscriptions | Trials
      >();

      // Whether this member may start the trial here: in person, with
      // billing:manage, neither the account, its address nor the
      // workspace had one.
      const trialFor = Effect.fn("BillingOverview.trialFor")(function* trialFor(
        actor: Actor
      ) {
        const { subject } = actor;

        if (
          subject._tag !== "user" ||
          Option.isSome(subject.impersonatedBy) ||
          Result.isFailure(authorize(actor, "billing:manage"))
        ) {
          return false;
        }

        return yield* trialOffered(subject.userId, actor.workspaceId);
      }, Effect.provide(context));

      const of = Effect.fn("BillingOverview.of")(function* of(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "billing:read"));

        const [current, used] = yield* Effect.all(
          [entitlements.of(actor.workspaceId), usage.of(actor.workspaceId)],
          { concurrency: "unbounded" }
        );

        const billing = Option.isSome(current.plan);
        const now = yield* DateTime.now;

        const overview: Overview = {
          entitlements: current,
          plans: billing ? catalogue : [],
          trial: billing
            ? Option.some({
                available: yield* trialFor(actor),
                days: trialDays,
                plan: trialPlan,
              })
            : Option.none(),
          usage: used,
          withdrawableUntil: current.subscription.pipe(
            Option.flatMap((subscription) =>
              Result.getSuccess(mayWithdraw(subscription, now))
            )
          ),
        };

        return overview;
      });

      return BillingOverview.of({ of });
    })
  );
}
