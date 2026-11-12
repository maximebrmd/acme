import { Option } from "effect";

import type { LegacyPaidPlan, PaidPlan } from "#shared/domain/plan.ts";

import type { BillingInterval } from "./billing-interval.ts";

/**
 * A legacy plan's published prices, in euro cents, excluding VAT: what Stripe's
 * tax-exclusive prices hold, and what a business with a validated VAT
 * number pays. A year costs ten months.
 */
export interface PlanPrice {
  readonly month: number;
  readonly year: number;
}

/** The currency every price is in. */
export const currency = "eur";

/**
 * The VAT rate prices are shown with first, in percent: France's, where
 * Peal is established. A consumer elsewhere in the EU pays their country's
 * rate, which checkout computes.
 */
export const displayVatRate = 20;

/**
 * What each paid plan costs, excluding VAT. Including France's VAT:
 * starter €9 a month or €90 a year, pro €15 or €150, business €30 or €300,
 * agency €60 or €600.
 */
export const planPrices: Readonly<Record<LegacyPaidPlan, PlanPrice>> = {
  agency: { month: 5000, year: 50_000 },
  business: { month: 2500, year: 25_000 },
  pro: { month: 1250, year: 12_500 },
  starter: { month: 750, year: 7500 },
};

/** A price including the VAT shown first (`displayVatRate`), in cents. */
export const withDisplayVat = (cents: number): number =>
  Math.round((cents * (100 + displayVatRate)) / 100);

/** The price of a plan for an interval, excluding VAT, in cents. */
export const priceOf = (
  plan: LegacyPaidPlan,
  interval: BillingInterval
): number => planPrices[plan][interval];

/**
 * The listed price of a paid plan for an interval, excluding VAT, in
 * cents: none for `payAsYouGo`, which the rate card prices by use.
 */
export const listedPriceOf = (
  plan: PaidPlan,
  interval: BillingInterval
): Option.Option<number> =>
  plan === "payAsYouGo" ? Option.none() : Option.some(priceOf(plan, interval));
