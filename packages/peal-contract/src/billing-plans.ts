import { Schema } from "effect";

/**
 * The plans a workspace can be on, from the smallest: `free`, without a
 * subscription, the legacy plans priced by tiers of connected channels
 * (`starter` to `agency`, kept for the subscriptions that still hold one),
 * and `payAsYouGo`, per-account pricing on the rate card
 * (`peal-contract/rate-card`).
 */
export const PlanSchema = Schema.Literals([
  "free",
  "starter",
  "pro",
  "business",
  "agency",
  "payAsYouGo",
]).annotate({ identifier: "Plan" });

export type Plan = typeof PlanSchema.Type;

/** The plans a subscription buys, from the smallest. */
export const PaidPlanSchema = Schema.Literals([
  "starter",
  "pro",
  "business",
  "agency",
  "payAsYouGo",
]).annotate({ identifier: "PaidPlan" });

export type PaidPlan = typeof PaidPlanSchema.Type;

/** `free` and the plans priced by tiers of connected channels. Legacy. */
export type LegacyPlan = Exclude<Plan, "payAsYouGo">;

/** The paid plans priced by tiers of connected channels. Legacy. */
export type LegacyPaidPlan = Exclude<PaidPlan, "payAsYouGo">;

/** The plans an order may name. */
export const OrderablePlanSchema = Schema.Literals([
  "starter",
  "pro",
  "business",
  "agency",
]).annotate({ identifier: "OrderablePlan" });

export type OrderablePlan = typeof OrderablePlanSchema.Type;

/**
 * What a plan limits: `channels` connected, `members` (pending invitations
 * count when inviting), `scheduledPosts` going out in a calendar month
 * (UTC), `assistantRequests` in a day (UTC), and `mediaStorage`, the bytes
 * of media stored, uploads in progress included. The server's list
 * (src/shared/domain/plan-limit.ts) is the source; a test keeps them equal.
 */
export const PlanLimitSchema = Schema.Literals([
  "channels",
  "members",
  "scheduledPosts",
  "assistantRequests",
  "mediaStorage",
]).annotate({ identifier: "PlanLimit" });

export type PlanLimit = typeof PlanLimitSchema.Type;

/**
 * How often a subscription is paid for. `year` is legacy: only the plans
 * priced by tiers of connected channels had it.
 */
export const BillingIntervalSchema = Schema.Literals([
  "month",
  "year",
]).annotate({ identifier: "BillingInterval" });

export type BillingInterval = typeof BillingIntervalSchema.Type;

/** What a plan allows, limit by limit; null for no limit. */
export type PlanLimits = { readonly [L in PlanLimit]: number | null };

/** A legacy paid plan's prices, in euro cents excluding VAT. Legacy. */
export interface PlanPrices {
  readonly month: number;
  readonly year: number;
}

/**
 * Peal Cloud's plans priced by tiers of connected channels, as the
 * server's billing context holds them (src/billing/domain/plans.ts and
 * prices.ts, the source; a test keeps them equal), for pages that show
 * prices before anyone signs in, such as the site's pricing page. Prices
 * are euro cents excluding VAT; a year costs ten months. A server that
 * does not bill has no plan. Legacy: per-account pricing replaces them
 * (`peal-contract/rate-card`), and `payAsYouGo` has no entry here.
 */
export const planCatalogue: Readonly<
  Record<
    LegacyPlan,
    { readonly limits: PlanLimits; readonly price: PlanPrices | null }
  >
> = {
  agency: {
    limits: {
      assistantRequests: 80,
      channels: 100,
      mediaStorage: 250_000_000_000,
      members: null,
      scheduledPosts: null,
    },
    price: { month: 5000, year: 50_000 },
  },
  business: {
    limits: {
      assistantRequests: 40,
      channels: 30,
      mediaStorage: 75_000_000_000,
      members: null,
      scheduledPosts: null,
    },
    price: { month: 2500, year: 25_000 },
  },
  free: {
    limits: {
      assistantRequests: 3,
      channels: 3,
      mediaStorage: 500_000_000,
      members: 2,
      scheduledPosts: 30,
    },
    price: null,
  },
  pro: {
    limits: {
      assistantRequests: 20,
      channels: 10,
      mediaStorage: 20_000_000_000,
      members: null,
      scheduledPosts: null,
    },
    price: { month: 1250, year: 12_500 },
  },
  starter: {
    limits: {
      assistantRequests: 10,
      channels: 5,
      mediaStorage: 5_000_000_000,
      members: 3,
      scheduledPosts: null,
    },
    price: { month: 750, year: 7500 },
  },
};

/** The currency of every price. */
export const billingCurrency = "eur";

/**
 * The VAT rate, in percent, prices are shown with first: France's, where
 * Peal is established. Consumers elsewhere in the EU pay their country's
 * rate, which checkout computes; businesses with a validated VAT number pay
 * the price excluding VAT.
 */
export const displayVatRate = 20;

/**
 * The plan a workspace may try once, and for how many days. Legacy: the
 * rate card's free accounts replace the trial.
 */
export const trialOffer = {
  days: 14,
  plan: "pro",
} as const satisfies { readonly days: number; readonly plan: LegacyPaidPlan };

/** A price in cents with the VAT shown first (`displayVatRate`). */
export const withDisplayVat = (cents: number): number =>
  Math.round((cents * (100 + displayVatRate)) / 100);

/** An amount of money, in the currency's smallest unit (cents). */
export const MoneySchema = Schema.Struct({
  amount: Schema.Int,
  currency: Schema.String,
}).annotate({ identifier: "Money" });

export type Money = typeof MoneySchema.Type;
