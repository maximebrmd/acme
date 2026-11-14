import { describe, expect, it } from "@effect/vitest";
import { rateCard } from "peal-contract/rate-card";
import type { RateCard } from "peal-contract/rate-card";

import { ladderOf, nextAccountOf } from "#billing/ladder.ts";

// A ladder no page shows, so the rows are read from the card, not typed.
const other: RateCard = {
  ...rateCard,
  prices: {
    usd: {
      ...rateCard.prices.usd,
      accounts: {
        bands: [
          { monthly: 0, upTo: 1 },
          { monthly: 700, upTo: null },
        ],
      },
    },
  },
};

describe(ladderOf, () => {
  it("lists the rate card's bands, from the first account, each price with the VAT shown beside", () => {
    expect(ladderOf()).toStrictEqual([
      { from: 1, monthly: { excluded: 0, included: 0 }, to: 2 },
      { from: 3, monthly: { excluded: 500, included: 600 }, to: 10 },
      { from: 11, monthly: { excluded: 300, included: 360 }, to: 100 },
      { from: 101, monthly: { excluded: 100, included: 120 }, to: null },
    ]);
  });

  it("follows the card it is given", () => {
    expect(ladderOf(other)).toStrictEqual([
      { from: 1, monthly: { excluded: 0, included: 0 }, to: 1 },
      { from: 2, monthly: { excluded: 700, included: 840 }, to: null },
    ]);
  });
});

describe(nextAccountOf, () => {
  it("prices the account after those connected at the band it falls in", () => {
    expect(nextAccountOf(0)).toStrictEqual({
      position: 1,
      price: { excluded: 0, included: 0 },
    });
    expect(nextAccountOf(2)).toStrictEqual({
      position: 3,
      price: { excluded: 500, included: 600 },
    });
    expect(nextAccountOf(10)).toStrictEqual({
      position: 11,
      price: { excluded: 300, included: 360 },
    });
    expect(nextAccountOf(250)).toStrictEqual({
      position: 251,
      price: { excluded: 100, included: 120 },
    });
  });

  it("reads a count of none from a negative or broken figure as none connected", () => {
    expect(nextAccountOf(-1).position).toBe(1);
    expect(nextAccountOf(Number.NaN).position).toBe(1);
  });
});
