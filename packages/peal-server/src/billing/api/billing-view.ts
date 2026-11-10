import { Option } from "effect";
import type {
  Billing,
  PlanAllowances,
  Standing as StandingView,
} from "peal-contract";

import type { Overview } from "#billing/application/billing-overview.ts";
import type { Standing } from "#billing/application/workspace-standing.ts";
import type { Allowances } from "#billing/domain/plans.ts";
import { currency, displayVatRate } from "#billing/domain/prices.ts";

// What clients see of billing, which the API and the MCP tools answer.

const allowancesView = (allowances: Allowances): PlanAllowances => ({
  assistantRequests: Option.getOrNull(allowances.assistantRequests),
  channels: Option.getOrNull(allowances.channels),
  mediaStorage: Option.getOrNull(allowances.mediaStorage),
  members: Option.getOrNull(allowances.members),
  scheduledPosts: Option.getOrNull(allowances.scheduledPosts),
});

/** What clients see of where a workspace stands against its plan. */
export const standingView = (standing: Standing): StandingView => ({
  mustReduce: standing.mustReduce,
  over: standing.over,
  plan: Option.getOrNull(standing.plan),
  planWithRoom: Option.getOrNull(standing.planWithRoom),
  scheduledPosts: standing.scheduledPosts,
});

/** What clients see of a workspace's billing. */
export const billingView = ({
  entitlements,
  plans,
  trial,
  usage,
  withdrawableUntil,
}: Overview): Billing => ({
  allowances: allowancesView(entitlements.allowances),
  currency,
  enabled: Option.isSome(entitlements.plan),
  plan: Option.getOrNull(entitlements.plan),
  plans: plans.map(({ allowances, plan, price }) => ({
    allowances: allowancesView(allowances),
    plan,
    price: Option.getOrNull(price),
  })),
  subscription: entitlements.subscription.pipe(
    Option.map((subscription) => ({
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: Option.getOrNull(subscription.currentPeriodEnd),
      endsAt: Option.getOrNull(subscription.endsAt),
      interval: subscription.interval,
      plan: subscription.plan,
      startedAt: Option.getOrNull(subscription.startedAt),
      status: subscription.status,
      trialEnd: Option.getOrNull(subscription.trialEnd),
    })),
    Option.getOrNull
  ),
  trial: Option.getOrNull(trial),
  usage,
  vatRate: displayVatRate,
  withdrawableUntil: Option.getOrNull(withdrawableUntil),
});
