import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { priceProblems, publishedPrices } from "#billing/domain/price-check.ts";
import type { StripePrice } from "#billing/domain/price-check.ts";
import { lookupKeysOf } from "#shared/infrastructure/stripe-settings.ts";

const published = publishedPrices(lookupKeysOf("peal"));

// Stripe's prices as they should be: each plan's, monthly and yearly, in
// euros, tax-exclusive.
const right: readonly StripePrice[] = published.map(
  ({ amount, interval, lookupKey }) => ({
    currency: "eur",
    interval: Option.some(interval),
    lookupKey,
    taxBehavior: Option.some("exclusive"),
    unitAmount: Option.some(amount),
  })
);

const withPrice = (lookupKey: string, change: Partial<StripePrice>) =>
  right.map((price) =>
    price.lookupKey === lookupKey ? { ...price, ...change } : price
  );

describe(priceProblems, () => {
  it("publishes a monthly and a yearly price for each paid plan", () => {
    expect(published).toHaveLength(8);
    expect(published).toContainEqual({
      amount: 12_500,
      interval: "year",
      lookupKey: "peal_pro_yearly",
      plan: "pro",
    });
  });

  it("finds nothing wrong with prices that match", () => {
    expect(priceProblems(published, right)).toStrictEqual([]);
  });

  it("names each price Stripe lacks, or holds differently", () => {
    expect(
      priceProblems(
        published,
        right.filter(({ lookupKey }) => lookupKey !== "peal_agency_yearly")
      )
    ).toStrictEqual([
      "peal_agency_yearly: Stripe has no active price with this lookup key",
    ]);

    expect(
      priceProblems(published, [
        ...withPrice("peal_starter_monthly", {
          currency: "usd",
          interval: Option.some("year"),
          taxBehavior: Option.some("inclusive"),
          unitAmount: Option.some(900),
        }),
      ])
    ).toStrictEqual([
      "peal_starter_monthly: Stripe charges 900 usd, the starter plan costs 750 eur excluding VAT",
      "peal_starter_monthly: Stripe bills it each year, not each month",
      "peal_starter_monthly: its tax behavior at Stripe is inclusive, not exclusive, so the VAT would not be added to it",
    ]);

    expect(
      priceProblems(
        published,
        withPrice("peal_pro_monthly", { taxBehavior: Option.none() })
      )
    ).toStrictEqual([
      "peal_pro_monthly: its tax behavior at Stripe is unspecified, not exclusive, so the VAT would not be added to it",
    ]);
  });
});
