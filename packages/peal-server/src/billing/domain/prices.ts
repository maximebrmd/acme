import { Option } from "effect";

import type { LegacyPaidPlan, PaidPlan } from "#shared/domain/plan.ts";

import type { BillingInterval } from "./billing-interval.ts";
import { planPrices } from "./legacy-plans.ts";

/** The currency every legacy plan's price is in. */
export const currency = "eur";

/**
 * The VAT rate prices are shown with first, in percent: France's, where
 * Peal is established. A consumer elsewhere in the EU pays their country's
 * rate, which checkout computes.
 */
export const displayVatRate = 20;

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
