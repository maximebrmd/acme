import { Effect, Option, Schema } from "effect";

import type { AllowanceReason } from "#shared/domain/allowance-reached.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { PlanLimit } from "#shared/domain/plan-limit.ts";
import { PlanSchema } from "#shared/domain/plan.ts";
import type { Plan } from "#shared/domain/plan.ts";

import { meterStandingOf, reasons } from "./meter-claims.ts";
import { allowancesOf, largerPlan, unlimited } from "./plans.ts";
import type { Allowances } from "./plans.ts";
import { rateCard } from "./rate-card.ts";
import { entitles, Subscription } from "./subscription.ts";

/** The limits whose allowance depends on the plan alone, not on usage. */
export type CountedLimit = Exclude<PlanLimit, "mediaStorage">;

/**
 * What a workspace may do: the plan its billing account is on, the
 * subscription that buys it, and whether the account keeps its free tier
 * (false once staff required a payment method). No plan at all on a
 * server that does not bill, which limits nothing. Every allowance is the
 * billing account's, across its workspaces.
 */
export class Entitlements extends Schema.Class<Entitlements>(
  "peal-server/billing/domain/Entitlements"
)({
  freeTier: Schema.Boolean,
  plan: Schema.Option(PlanSchema),
  subscription: Schema.Option(Subscription),
  // Whether any of its subscriptions had an invoice paid that took
  // something: per-account pricing's ceiling is lifted for good then.
  verified: Schema.Boolean.pipe(
    Schema.withConstructorDefault(Effect.succeed(false))
  ),
}) {
  /**
   * Every limit of its plan, or none, media storage for `accounts`
   * connected across the billing account (per-account pricing's grows
   * with them).
   */
  allowancesFor(accounts: number): Allowances {
    return Option.match(this.plan, {
      onNone: () => unlimited,
      onSome: (plan) =>
        allowancesOf(plan, { accounts, freeTier: this.freeTier }),
    });
  }

  /** One limit of its plan that depends on nothing it holds. */
  allowanceOf(limit: CountedLimit): Allowance {
    return this.allowancesFor(0)[limit];
  }

  /**
   * Why its billing account cannot use a meter passed through at a
   * platform's rates (X's, `xApi`), which only per-account pricing that
   * pays bills: none on per-account pricing, nor on a server that does
   * not bill; otherwise the meter's refusal for its standing (no payment
   * method, a payment failing, a legacy plan).
   */
  passThroughRefusal(): Option.Option<AllowanceReason> {
    if (Option.isNone(this.plan)) {
      return Option.none();
    }

    const standing = meterStandingOf({
      plan: this.plan,
      status: this.subscription.pipe(Option.map(({ status }) => status)),
    });

    return standing === "payAsYouGo"
      ? Option.none()
      : Option.some(reasons[standing]);
  }

  /**
   * The accounts its billing account may hold once one more is
   * connected: its plan's, but per-account pricing on an account none of
   * whose subscriptions had an invoice paid yet holds the rate card's
   * `unverifiedCeiling`. Only
   * connecting is held to it: what is connected already never makes the
   * account over its plan.
   */
  connectableAccounts(): Allowance {
    const allowed = this.allowanceOf("channels");

    return Option.isNone(allowed) &&
      Option.contains(this.plan, "payAsYouGo") &&
      !this.verified
      ? Option.some(rateCard.unverifiedCeiling)
      : allowed;
  }
}

/** A server that does not bill: no plan, no limit. */
export const unmetered = new Entitlements({
  freeTier: true,
  plan: Option.none(),
  subscription: Option.none(),
});

// The subscription of the largest plan, the first one of the plan when
// several give the same.
const best = (
  subscriptions: readonly Subscription[]
): Option.Option<Subscription> => {
  let found = Option.none<Subscription>();

  for (const next of subscriptions) {
    found = Option.match(found, {
      onNone: () => Option.some(next),
      onSome: (current) =>
        Option.some(
          largerPlan(current.plan, next.plan) === current.plan ? current : next
        ),
    });
  }

  return found;
};

/**
 * A workspace's entitlements on a server that bills: the largest plan its
 * billing account's subscriptions give (`entitles`), `payAsYouGo` above
 * any legacy plan, or `free`; with the account's free tier, which staff
 * can take away (`freeTier` false: no account is free).
 */
export const entitlementsOf = (
  subscriptions: readonly Subscription[],
  freeTier = true
): Entitlements => {
  const giving = best(
    subscriptions.filter((subscription) => entitles(subscription))
  );

  return new Entitlements({
    freeTier,
    verified: subscriptions.some(({ paidInvoiceAt }) =>
      Option.isSome(paidInvoiceAt)
    ),
    plan: Option.some(
      Option.match(giving, {
        onNone: (): Plan => "free",
        onSome: ({ plan }): Plan => plan,
      })
    ),
    subscription: giving,
  });
};
