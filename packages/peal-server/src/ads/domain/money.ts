import { Schema } from "effect";

import type { AdNetwork } from "./ad-network.ts";

/** An ISO 4217 currency code, as ad networks write them: `EUR`, `USD`. */
export const CurrencySchema = Schema.String.check(
  Schema.isPattern(/^[A-Z]{3}$/u)
).pipe(Schema.brand("Currency"));

export type Currency = typeof CurrencySchema.Type;

/** The largest amount Peal keeps, in minor units: no budget comes near. */
export const maxAmount = 1_000_000_000_000;

/**
 * An amount in a currency's minor units, as the ad network counts them: a
 * whole number, never a fraction, so no sum ever rounds.
 */
export const AmountSchema = Schema.Int.check(
  Schema.isBetween({ maximum: maxAmount, minimum: 0 })
);

/**
 * Money: an amount in the minor units of its currency (cents for EUR and
 * USD, yen for JPY). Amounts of different currencies are never added or
 * compared: `sameCurrency` is checked first.
 */
export class Money extends Schema.Class<Money>("peal-server/ads/domain/Money")({
  amount: AmountSchema,
  currency: CurrencySchema,
}) {}

// Meta's "Currencies" page: budgets are in the currency's smallest
// denomination, a hundredth of the unit for most (offset 100) and the unit
// itself for these (offset 1).
const metaWholeUnitCurrencies: ReadonlySet<string> = new Set([
  "CLP",
  "COP",
  "CRC",
  "HUF",
  "IDR",
  "ISK",
  "JPY",
  "KRW",
  "PYG",
  "TWD",
  "VND",
]);

/**
 * How many decimal digits separate a currency's unit from the minor unit
 * the network counts budgets in: 2 for most, 0 where the network takes
 * whole units. It follows the network's own table, not ISO 4217's, which
 * gives some of these currencies decimals the network does not use.
 */
export const minorUnitDigits = (
  _network: AdNetwork,
  currency: Currency
): 0 | 2 => (metaWholeUnitCurrencies.has(currency) ? 0 : 2);

const decimal = /^(?<whole>\d{1,13})(?:\.(?<fraction>\d{1,6}))?$/u;

/**
 * The minor units a decimal amount in whole units names, as networks
 * report what was spent (`"12.5"` is 1250 cents): read digit by digit,
 * never through a float, and rounded up, so spend is never understated.
 * Undefined for anything that is not a plain decimal number.
 */
export const minorUnitsOf = (
  written: string,
  digits: 0 | 2
): number | undefined => {
  const groups = decimal.exec(written)?.groups;

  if (groups === undefined) {
    return undefined;
  }

  const fraction = (groups["fraction"] ?? "").padEnd(6, "0");
  const kept = digits === 0 ? "" : fraction.slice(0, digits);
  const dropped = fraction.slice(digits);

  const amount =
    Number(`${groups["whole"] ?? "0"}${kept}`) +
    (/[1-9]/u.test(dropped) ? 1 : 0);

  return amount > maxAmount ? undefined : amount;
};
