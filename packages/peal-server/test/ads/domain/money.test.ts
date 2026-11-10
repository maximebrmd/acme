import { describe, expect, it } from "@effect/vitest";

import {
  CurrencySchema,
  minorUnitDigits,
  minorUnitsOf,
} from "#ads/domain/money.ts";

describe(minorUnitDigits, () => {
  it("counts cents for most currencies", () => {
    expect(minorUnitDigits("meta", CurrencySchema.make("EUR"))).toBe(2);
    expect(minorUnitDigits("meta", CurrencySchema.make("USD"))).toBe(2);
  });

  it("counts whole units where the network takes no smaller", () => {
    expect(minorUnitDigits("meta", CurrencySchema.make("JPY"))).toBe(0);
    expect(minorUnitDigits("meta", CurrencySchema.make("HUF"))).toBe(0);
  });
});

describe(minorUnitsOf, () => {
  it("reads a decimal amount as minor units", () => {
    expect(minorUnitsOf("5339.5", 2)).toBe(533_950);
    expect(minorUnitsOf("12", 2)).toBe(1200);
    expect(minorUnitsOf("0.07", 2)).toBe(7);
    expect(minorUnitsOf("1500", 0)).toBe(1500);
  });

  it("never loses a cent to a float", () => {
    // 0.1 + 0.2 in floats is not 0.3: digits are read as written.
    expect(minorUnitsOf("0.30", 2)).toBe(30);
    expect(minorUnitsOf("1.15", 2)).toBe(115);
    expect(minorUnitsOf("4.35", 2)).toBe(435);
  });

  it("rounds a finer amount up, so spend is never understated", () => {
    expect(minorUnitsOf("1.001", 2)).toBe(101);
    expect(minorUnitsOf("12.5", 0)).toBe(13);
    expect(minorUnitsOf("12.000", 0)).toBe(12);
  });

  it("refuses what is not a plain decimal", () => {
    expect(minorUnitsOf("", 2)).toBeUndefined();
    expect(minorUnitsOf("-1", 2)).toBeUndefined();
    expect(minorUnitsOf("1e3", 2)).toBeUndefined();
    expect(minorUnitsOf("1,5", 2)).toBeUndefined();
    expect(minorUnitsOf("99999999999999", 2)).toBeUndefined();
  });
});
