import { Effect, Option } from "effect";
import type {
  Billing,
  BillingAccount,
  PlanAllowances,
  Standing as StandingView,
} from "peal-contract";

import type { AccountView } from "#billing/application/account-views.ts";
import type { Overview } from "#billing/application/billing-overview.ts";
import type { Standing } from "#billing/application/workspace-standing.ts";
import type { Allowances } from "#billing/domain/plans.ts";
import { currency, displayVatRate } from "#billing/domain/prices.ts";

// What clients see of billing, which the API and the MCP tools answer.

/** What clients see of what a plan allows. */
export const allowancesView = (allowances: Allowances): PlanAllowances => ({
  assistantRequests: Option.getOrNull(allowances.assistantRequests),
  channels: Option.getOrNull(allowances.channels),
  mediaStorage: Option.getOrNull(allowances.mediaStorage),
  members: Option.getOrNull(allowances.members),
  scheduledPosts: Option.getOrNull(allowances.scheduledPosts),
});

/** What clients see of the billing account a workspace is on. */
export const accountView = ({
  account,
  holderName,
  others,
  payer,
  transfer,
  workspaces,
}: AccountView): BillingAccount => ({
  billingWorkspaceId: account.holder,
  billingWorkspaceName: Option.getOrNull(holderName),
  id: account.id,
  otherWorkspaces: others,
  partner: Option.isSome(account.partnerId),
  payer,
  transfer: transfer.pipe(
    Option.map(({ expiresAt, offeredAt, offeredBy, toUserId }) => ({
      expiresAt,
      offeredAt,
      offeredBy,
      toUserId,
    })),
    Option.getOrNull
  ),
  workspaces,
});

/** What clients see of where a workspace stands against its plan. */
export const standingView = (
  standing: Standing,
  account: Option.Option<AccountView>
): StandingView => ({
  ...Option.match(account, {
    onNone: () => ({}),
    onSome: (view) => ({ account: accountView(view) }),
  }),
  graceUntil: Option.getOrNull(standing.graceUntil),
  mustReduce: standing.mustReduce,
  over: standing.over,
  plan: Option.getOrNull(standing.plan),
  planWithRoom: Option.getOrNull(standing.planWithRoom),
  scheduledPosts: standing.scheduledPosts,
});

/**
 * The billing account a workspace's billing page tells of, on a server
 * that bills: one that does not reads none.
 */
export const accountShown = <E, R>(
  overview: Overview,
  read: Effect.Effect<AccountView, E, R>
): Effect.Effect<Option.Option<AccountView>, E, R> =>
  Option.isSome(overview.entitlements.plan)
    ? read.pipe(Effect.map(Option.some))
    : Effect.succeedNone;

/** What clients see of a workspace's billing. */
export const billingView = (
  { entitlements, plans, trial, usage, withdrawableUntil }: Overview,
  account: Option.Option<AccountView>
): Billing => ({
  ...Option.match(account, {
    onNone: () => ({}),
    onSome: (view) => ({ account: accountView(view) }),
  }),
  allowances: allowancesView(entitlements.allowancesFor(usage.channels)),
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
