import { Effect, Option } from "effect";
import type {
  Billing,
  BillingAccount,
  BillingMeter,
  PlanAllowances,
  Standing as StandingView,
} from "peal-contract";

import type { AccountView } from "#billing/application/account-views.ts";
import type { Overview } from "#billing/application/billing-overview.ts";
import type { Standing } from "#billing/application/workspace-standing.ts";
import type { MeterMonth } from "#billing/domain/meter-claims.ts";
import type { Allowances } from "#billing/domain/plans.ts";
import { currency, displayVatRate } from "#billing/domain/prices.ts";
import {
  rateCard as card,
  unconfirmedMeters,
} from "#billing/domain/rate-card.ts";

// Cents of the rate card's currency.
const usd = (amount: number) => ({ amount, currency: "usd" });

/**
 * What clients see of a meter this month: its money (what is billed, the
 * ceiling, the estimate) only for the workspace that bills the account;
 * every workspace reads the counts and the allowance. The most it may use
 * past the allowance is what its ceiling or the cap pays for, so another
 * workspace reads no more than the allowance.
 */
export const meterView = (
  month: MeterMonth,
  billing: boolean
): BillingMeter => ({
  allowance: month.allowance,
  billable: billing ? month.billable : null,
  ceiling: billing
    ? month.ceiling.pipe(Option.map(usd), Option.getOrNull)
    : null,
  estimate: billing ? usd(month.charge) : null,
  group: Option.getOrNull(month.group),
  meter: month.meter,
  most: billing
    ? Option.getOrNull(month.most)
    : Math.min(
        month.allowance,
        Option.getOrElse(month.most, () => month.allowance)
      ),
  price: card.prices.usd.meters[month.meter],
  priceConfirmed: !unconfirmedMeters.includes(month.meter),
  resetsAt: month.resetsAt,
  used: month.used,
});

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
  {
    accounts,
    allowances,
    billsHere,
    entitlements,
    estimate,
    meters,
    paymentFailed,
    paymentMethod,
    plans,
    rateCard,
    trial,
    upcomingInvoice,
    usage,
    withdrawableUntil,
    x,
  }: Overview,
  account: Option.Option<AccountView>
): Billing => ({
  ...Option.match(account, {
    onNone: () => ({}),
    onSome: (view) => ({ account: accountView(view) }),
  }),
  accounts: {
    accountDays: Option.getOrNull(accounts.accountDays),
    connected: accounts.connected,
    estimate: Option.getOrNull(accounts.estimate),
    nextAccount: Option.getOrNull(accounts.nextAccount),
    pooled: accounts.pooled,
  },
  allowances: allowancesView(allowances),
  currency,
  enabled: Option.isSome(entitlements.plan),
  estimate: Option.getOrNull(estimate),
  meters: meters.pipe(
    Option.map(({ billing, months }) =>
      months.map((month) => meterView(month, billing))
    ),
    Option.getOrNull
  ),
  paymentFailed,
  paymentMethod,
  plan: Option.getOrNull(entitlements.plan),
  plans: plans.map(({ allowances: offered, plan, price }) => ({
    allowances: allowancesView(offered),
    plan,
    price: Option.getOrNull(price),
  })),
  // The account's contract, for the workspace that bills it only.
  subscription: entitlements.subscription.pipe(
    Option.filter(() => billsHere),
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
  rateCard: Option.getOrNull(rateCard),
  trial: Option.getOrNull(trial),
  upcomingInvoice: Option.getOrNull(upcomingInvoice),
  usage,
  vatRate: displayVatRate,
  withdrawableUntil: Option.getOrNull(withdrawableUntil),
  x: x.pipe(
    Option.map(({ reads, setAt }) => ({
      reads,
      setAt: Option.getOrNull(setAt),
    })),
    Option.getOrNull
  ),
});
