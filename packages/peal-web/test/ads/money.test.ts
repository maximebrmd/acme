import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  decimalOf,
  digitsOfCurrency,
  formatMoney,
  parseAmount,
} from "#ads/money.ts";

describe(parseAmount, () => {
  it("reads units and cents as minor units, digit by digit", () => {
    expect(parseAmount("50", 2)).toStrictEqual(Option.some(5000));
    expect(parseAmount("50.5", 2)).toStrictEqual(Option.some(5050));
    expect(parseAmount("50,05", 2)).toStrictEqual(Option.some(5005));
    expect(parseAmount(" 0.29 ", 2)).toStrictEqual(Option.some(29));
    expect(parseAmount("0", 2)).toStrictEqual(Option.some(0));
  });

  it("keeps amounts a float would bend", () => {
    expect(parseAmount("0.07", 2)).toStrictEqual(Option.some(7));
    expect(parseAmount("1.15", 2)).toStrictEqual(Option.some(115));
    expect(parseAmount("4.35", 2)).toStrictEqual(Option.some(435));
    expect(parseAmount("8.20", 2)).toStrictEqual(Option.some(820));
  });

  it("takes whole amounts only in a currency without a minor unit", () => {
    expect(parseAmount("5000", 0)).toStrictEqual(Option.some(5000));
    expect(parseAmount("5000.5", 0)).toStrictEqual(Option.none());
    expect(parseAmount("5000,00", 0)).toStrictEqual(Option.none());
  });

  it.each([
    "",
    " ",
    "abc",
    "-5",
    "+5",
    "5.",
    ".5",
    "1.234",
    "1e3",
    "5 0",
    "€5",
  ])("refuses %j", (text) => {
    expect(parseAmount(text, 2)).toStrictEqual(Option.none());
  });

  it("refuses more than Peal keeps", () => {
    expect(parseAmount("10000000000", 2)).toStrictEqual(
      Option.some(1_000_000_000_000)
    );
    expect(parseAmount("10000000000.01", 2)).toStrictEqual(Option.none());
    expect(parseAmount("1000000000001", 0)).toStrictEqual(Option.none());
  });
});

describe(decimalOf, () => {
  it("writes minor units in the currency's units", () => {
    expect(decimalOf(5000, 2)).toBe("50.00");
    expect(decimalOf(5, 2)).toBe("0.05");
    expect(decimalOf(0, 2)).toBe("0.00");
    expect(decimalOf(5000, 0)).toBe("5000");
  });

  it("is read back as the same amount", () => {
    expect(parseAmount(decimalOf(123_456, 2), 2)).toStrictEqual(
      Option.some(123_456)
    );
    expect(parseAmount(decimalOf(123_456, 0), 0)).toStrictEqual(
      Option.some(123_456)
    );
  });
});

describe(formatMoney, () => {
  it("writes money with two digits, in English and in French", () => {
    expect(formatMoney("en", 5000, "EUR", 2)).toBe("€50.00");
    expect(formatMoney("en", 123_456, "USD", 2)).toBe("$1,234.56");
    expect(formatMoney("fr", 5005, "EUR", 2).replaceAll(/\s/gu, " ")).toBe(
      "50,05 €"
    );
  });

  it("writes a currency without a minor unit whole", () => {
    expect(formatMoney("en", 5000, "JPY", 0)).toBe("¥5,000");
  });

  it("writes a currency the engine refuses by its code", () => {
    expect(formatMoney("en", 5000, "not a currency", 2)).toBe(
      "50.00 not a currency"
    );
  });
});

describe(digitsOfCurrency, () => {
  it("gives no digits to a currency without a minor unit, two otherwise", () => {
    expect(digitsOfCurrency("JPY")).toBe(0);
    expect(digitsOfCurrency("EUR")).toBe(2);
    expect(digitsOfCurrency("not a currency")).toBe(2);
  });
});
