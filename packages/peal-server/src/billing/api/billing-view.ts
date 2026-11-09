import type { Billing, PlanAllowances } from "peal-contract";
import { Option } from "effect";

import type { Overview } from "#billing/application/billing-overview.ts";
import type { Allowances } from "#billing/domain/plans.ts";

// What clients see of billing, which the API and the MCP tools answer.

const allowancesView = (allowances: Allowances): PlanAllowances => ({
  assistantRequests: Option.getOrNull(allowances.assistantRequests),
  channels: Option.getOrNull(allowances.channels),
  members: Option.getOrNull(allowances.members),
  scheduledPosts: Option.getOrNull(allowances.scheduledPosts),
});

/** What clients see of a workspace's billing. */
export const billingView = ({
  entitlements,
  plans,
  usage,
}: Overview): Billing => ({
  allowances: allowancesView(entitlements.allowances),
  enabled: Option.isSome(entitlements.plan),
  plan: Option.getOrNull(entitlements.plan),
  plans: plans.map(({ allowances, plan }) => ({
    allowances: allowancesView(allowances),
    plan,
  })),
  subscription: entitlements.subscription.pipe(
    Option.map((subscription) => ({
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: Option.getOrNull(subscription.currentPeriodEnd),
      plan: subscription.plan,
      status: subscription.status,
    })),
    Option.getOrNull
  ),
  usage,
});
