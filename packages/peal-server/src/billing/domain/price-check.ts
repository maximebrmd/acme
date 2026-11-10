import { Option } from "effect";

import { PaidPlanSchema } from "#shared/domain/plan.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import type { BillingInterval } from "./billing-interval.ts";
import { currency, priceOf } from "./prices.ts";

/** A price Peal publishes, and the lookup key Stripe must hold it under. */
export interface PublishedPrice {
  /** In cents, excluding VAT. */
  readonly amount: number;
  readonly interval: BillingInterval;
  readonly lookupKey: string;
  readonly plan: PaidPlan;
}

/** What Stripe holds of an active price. */
export interface StripePrice {
  readonly currency: string;
  /** How often it is billed; none for a price paid once. */
  readonly interval: Option.Option<string>;
  readonly lookupKey: string;
  /** `exclusive`, `inclusive` or `unspecified`, as Stripe names them. */
  readonly taxBehavior: Option.Option<string>;
  /** In cents; none for a price that is not a fixed amount. */
  readonly unitAmount: Option.Option<number>;
}

const intervals: readonly BillingInterval[] = ["month", "year"];

/** Every price Peal publishes, under the lookup keys the server reads. */
export const publishedPrices = (
  keys: Readonly<Record<PaidPlan, Readonly<Record<BillingInterval, string>>>>
): readonly PublishedPrice[] =>
  PaidPlanSchema.literals.flatMap((plan) =>
    intervals.map((interval) => ({
      amount: priceOf(plan, interval),
      interval,
      lookupKey: keys[plan][interval],
      plan,
    }))
  );

const problemsOf = (
  { amount, interval, lookupKey, plan }: PublishedPrice,
  found: StripePrice
): readonly string[] => {
  const charged = Option.getOrElse(found.unitAmount, () => 0);
  const billed = Option.getOrElse(found.interval, () => "once");
  const tax = Option.getOrElse(found.taxBehavior, () => "unspecified");

  return [
    ...(charged === amount && found.currency === currency
      ? []
      : [
          `${lookupKey}: Stripe charges ${String(charged)} ${found.currency}, the ${plan} plan costs ${String(amount)} ${currency} excluding VAT`,
        ]),
    ...(billed === interval
      ? []
      : [`${lookupKey}: Stripe bills it each ${billed}, not each ${interval}`]),
    ...(tax === "exclusive"
      ? []
      : [
          `${lookupKey}: its tax behavior at Stripe is ${tax}, not exclusive, so the VAT would not be added to it`,
        ]),
  ];
};

/**
 * What is wrong with Stripe's prices for the ones Peal publishes: one that
 * is missing, costs something else, is billed at another interval, or is
 * not tax-exclusive. Every page shows the published prices, with VAT added
 * on top: a server whose Stripe prices differ would charge something else
 * than it shows.
 */
export const priceProblems = (
  published: readonly PublishedPrice[],
  found: readonly StripePrice[]
): readonly string[] =>
  published.flatMap((price) => {
    const held = found.find(({ lookupKey }) => lookupKey === price.lookupKey);

    return held === undefined
      ? [`${price.lookupKey}: Stripe has no active price with this lookup key`]
      : problemsOf(price, held);
  });
