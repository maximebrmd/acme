import { describe, expect, it } from "@effect/vitest";
import { DateTime, Schema } from "effect";

import {
  accountsCharge,
  accountsMonthly,
  billableAccountDays,
  billableUnits,
  meterAllowance,
  meterCharge,
  MeterSchema,
  rateCard,
  storageAllowance,
  stripeTiersOf,
} from "#billing/domain/rate-card.ts";

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const gigabytes = (count: number) => count * 1_000_000_000;

/** The account-days a month bills for `accounts` connected every day. */
const monthOf = (accounts: number, days: number): number =>
  Array.from({ length: days }, (_, index) =>
    billableAccountDays(
      day(`2026-01-${String(index + 1).padStart(2, "0")}`),
      accounts
    )
  ).reduce((sum, billed) => sum + billed, 0);

describe("the rate card", () => {
  it("lists its prices in US dollars only, keyed by currency", () => {
    expect(Object.keys(rateCard.prices)).toStrictEqual(["usd"]);
  });

  it("gives every meter its terms and its price", () => {
    const meters = [...MeterSchema.literals].toSorted();

    expect(Object.keys(rateCard.meters).toSorted()).toStrictEqual(meters);
    expect(Object.keys(rateCard.prices.usd.meters).toSorted()).toStrictEqual(
      meters
    );
  });

  it("stops X and the assistant past their allowance by default", () => {
    expect(rateCard.meters.xApi.ceiling).toBe(rateCard.x.defaultCeiling);
    expect(rateCard.meters.xApi.ceiling).toBe(2500);
    expect(rateCard.meters.assistantRequests.ceiling).toBe(0);
    expect(rateCard.meters.assistantImages.ceiling).toBe(0);
    expect(rateCard.meters.outboundMessages.ceiling).toBeNull();
  });
});

describe(accountsMonthly, () => {
  it("prices a month of accounts on the graduated ladder", () => {
    expect(accountsMonthly(0)).toBe(0);
    expect(accountsMonthly(2)).toBe(0);
    expect(accountsMonthly(3)).toBe(500);
  });

  it("lowers the rate per account as the bands go up", () => {
    expect(accountsMonthly(10)).toBe(4000);
    expect(accountsMonthly(20)).toBe(7000);
    expect(accountsMonthly(100)).toBe(31_000);
    expect(accountsMonthly(1000)).toBe(121_000);
  });
});

describe(accountsCharge, () => {
  it("prices account-days at one thirtieth of the monthly rate", () => {
    expect(accountsCharge(300)).toBe(4000);
    expect(accountsCharge(600)).toBe(7000);
    expect(accountsCharge(3000)).toBe(31_000);
    expect(accountsCharge(30_000)).toBe(121_000);
  });

  it("leaves the first two accounts' days free", () => {
    expect(accountsCharge(0)).toBe(0);
    expect(accountsCharge(60)).toBe(0);
  });

  it("rounds each band half up, to the cent", () => {
    // 1 day at $5 / 30 is 16.67 cents, 2 days 33.33.
    expect(accountsCharge(61)).toBe(17);
    expect(accountsCharge(62)).toBe(33);
    // 1 day at $1 / 30 is 3.33 cents.
    expect(accountsCharge(3001)).toBe(31_003);
  });

  it("charges 2 accounts nothing in a 31-day month", () => {
    expect(accountsCharge(monthOf(2, 31))).toBe(0);
  });

  it.prop(
    "never charges less for more account-days",
    {
      accountDays: Schema.Int.check(
        Schema.isBetween({ maximum: 100_000, minimum: 0 })
      ),
    },
    ({ accountDays }) =>
      accountsCharge(accountDays + 1) >= accountsCharge(accountDays)
  );

  it.prop(
    "never charges a month more than its accounts' monthly price",
    {
      accounts: Schema.Int.check(
        Schema.isBetween({ maximum: 5000, minimum: 0 })
      ),
      days: Schema.Int.check(Schema.isBetween({ maximum: 31, minimum: 28 })),
    },
    ({ accounts, days }) =>
      accountsCharge(monthOf(accounts, days)) <= accountsMonthly(accounts)
  );
});

describe(billableAccountDays, () => {
  it("bills each day's peak", () => {
    expect(billableAccountDays(day("2026-01-30"), 12)).toBe(12);
    expect(billableAccountDays(day("2026-02-28"), 12)).toBe(12);
  });

  it("bills nothing on the 31st", () => {
    expect(billableAccountDays(day("2026-01-31"), 12)).toBe(0);
    expect(monthOf(10, 31)).toBe(monthOf(10, 30));
  });
});

describe(meterAllowance, () => {
  it("gives messages and managed ads with a payment method or without", () => {
    expect(meterAllowance("outboundMessages", false)).toBe(10_000);
    expect(meterAllowance("outboundMessages", true)).toBe(10_000);
    expect(meterAllowance("managedAds", false)).toBe(500);
  });

  it("includes nothing of the server's assistant or X without a payment method", () => {
    expect(meterAllowance("assistantRequests", false)).toBe(0);
    expect(meterAllowance("assistantImages", false)).toBe(0);
    expect(meterAllowance("xApi", false)).toBe(0);
  });

  it("gives a payer the assistant's allowance, and nothing free on X", () => {
    expect(meterAllowance("assistantRequests", true)).toBe(100);
    expect(meterAllowance("assistantImages", true)).toBe(10);
    expect(meterAllowance("xApi", true)).toBe(0);
  });
});

describe(billableUnits, () => {
  it("bills what goes past the monthly allowance", () => {
    expect(billableUnits("outboundMessages", 12_000)).toBe(2000);
    expect(billableUnits("assistantRequests", 100)).toBe(0);
    expect(billableUnits("assistantRequests", 101)).toBe(1);
    expect(billableUnits("assistantImages", 10)).toBe(0);
    expect(billableUnits("managedAds", 501)).toBe(1);
  });

  it("bills every unit of a meter without an allowance", () => {
    expect(billableUnits("xApi", 15)).toBe(15);
  });
});

describe(meterCharge, () => {
  it("prices billable units in cents", () => {
    expect(meterCharge("outboundMessages", 2000)).toBe(20);
    expect(meterCharge("assistantRequests", 3)).toBe(3);
    expect(meterCharge("assistantImages", 3)).toBe(15);
    expect(meterCharge("managedAds", 7)).toBe(7);
  });

  it("prices X's units, thousandths of a dollar, to the cent", () => {
    // X's units are thousandths of a dollar: a post created costs 15.
    expect(meterCharge("xApi", 15)).toBe(2);
    expect(meterCharge("xApi", 200)).toBe(20);
  });
});

// A count is a whole number, zero or more: anything else is a bug in the
// caller, refused the same way by every function, never priced.
describe("counts the rate card refuses", () => {
  const refused = [-1, -50, 2.5, Number.NaN, Number.POSITIVE_INFINITY];

  it.each(refused)("refuses %s accounts and account-days", (count) => {
    expect(() => accountsMonthly(count)).toThrow(RangeError);
    expect(() => accountsCharge(count)).toThrow(RangeError);
    expect(() => billableAccountDays(day("2026-01-02"), count)).toThrow(
      RangeError
    );
    expect(() => storageAllowance(true, count)).toThrow(RangeError);
  });

  it.each(refused)("refuses %s units of a meter", (count) => {
    expect(() => billableUnits("managedAds", count)).toThrow(RangeError);
    expect(() => meterCharge("managedAds", count)).toThrow(RangeError);
    expect(() => meterCharge("outboundMessages", count)).toThrow(RangeError);
  });
});

describe(storageAllowance, () => {
  it("keeps a workspace without a payment method to 1 GB", () => {
    expect(storageAllowance(false, 2)).toBe(gigabytes(1));
  });

  it("gives a paying workspace 5 GB per account, 5 GB at least", () => {
    expect(storageAllowance(true, 0)).toBe(gigabytes(5));
    expect(storageAllowance(true, 1)).toBe(gigabytes(5));
    expect(storageAllowance(true, 10)).toBe(gigabytes(50));
  });
});

describe(stripeTiersOf, () => {
  it("gives the ladder's tiers in account-days and cents per day", () => {
    expect(stripeTiersOf(rateCard)).toStrictEqual([
      { unitAmountDecimal: "0", upTo: 60 },
      { unitAmountDecimal: "16.666666666667", upTo: 300 },
      { unitAmountDecimal: "10", upTo: 3000 },
      { unitAmountDecimal: "3.333333333333", upTo: null },
    ]);
  });

  it("prices account-days as Stripe's graduated rule does", () => {
    const tiers = stripeTiersOf(rateCard);

    // Each tier's units at its decimal amount, rounded half up per tier.
    const stripeCharge = (accountDays: number) => {
      let sum = 0;
      let from = 0;

      for (const { unitAmountDecimal, upTo } of tiers) {
        const to = upTo ?? Number.POSITIVE_INFINITY;
        const units = Math.max(0, Math.min(accountDays, to) - from);

        sum += Math.round(units * Number(unitAmountDecimal));
        from = to;
      }

      return sum;
    };

    for (const accountDays of [60, 61, 300, 600, 3000, 3001, 30_000]) {
      expect(stripeCharge(accountDays)).toBe(accountsCharge(accountDays));
    }

    expect(stripeCharge(300)).toBe(4000);
    expect(stripeCharge(600)).toBe(7000);
    expect(stripeCharge(3000)).toBe(31_000);
  });
});
