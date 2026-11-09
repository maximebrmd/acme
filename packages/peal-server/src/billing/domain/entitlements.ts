import { Option, Schema } from "effect";

import { PlanSchema } from "#shared/domain/plan.ts";
import type { Plan } from "#shared/domain/plan.ts";

import { largerPlan, planAllowances, unlimited } from "./plans.ts";
import type { Allowances } from "./plans.ts";
import { entitles, Subscription } from "./subscription.ts";

/**
 * What a workspace may do: the plan it is on and the subscription that buys
 * it. No plan at all on a server that does not bill, which limits nothing.
 */
export class Entitlements extends Schema.Class<Entitlements>(
  "acme-server/billing/domain/Entitlements"
)({
  plan: Schema.Option(PlanSchema),
  subscription: Schema.Option(Subscription),
}) {
  /** Each limit of its plan, or none. */
  get allowances(): Allowances {
    return Option.match(this.plan, {
      onNone: () => unlimited,
      onSome: (plan) => planAllowances[plan],
    });
  }
}

/** A server that does not bill: no plan, no limit. */
export const unmetered = new Entitlements({
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
 * subscriptions give (`entitles`), or the free plan.
 */
export const entitlementsOf = (
  subscriptions: readonly Subscription[]
): Entitlements => {
  const giving = best(
    subscriptions.filter((subscription) => entitles(subscription))
  );

  return new Entitlements({
    plan: Option.some(
      Option.match(giving, {
        onNone: (): Plan => "free",
        onSome: ({ plan }): Plan => plan,
      })
    ),
    subscription: giving,
  });
};
