import { Option } from "effect";
import { maxAdAmount } from "peal-contract";

// Amounts of ad money are whole numbers of the currency's minor unit, as
// the ad network counts them: cents for EUR, yen for JPY. Nothing here
// computes on a fraction: what a person types is read digit by digit, and
// what is shown is written from the amount's own digits.

/** How many decimal digits a currency's unit has over its minor unit. */
export type MinorUnitDigits = 0 | 2;

const patterns: Readonly<Record<MinorUnitDigits, RegExp>> = {
  0: /^(?<units>\d{1,13})$/u,
  2: /^(?<units>\d{1,11})(?:[.,](?<cents>\d{1,2}))?$/u,
};

/**
 * The amount a person typed in the currency's units ("50", "50.5",
 * "50,50"), in minor units. None for anything else: a sign, a third
 * decimal, decimals in a currency that has none, or more than Peal keeps.
 */
export const parseAmount = (
  text: string,
  digits: MinorUnitDigits
): Option.Option<number> =>
  Option.fromNullishOr(patterns[digits].exec(text.trim())?.groups).pipe(
    Option.map(({ cents = "", units = "0" }) =>
      digits === 0
        ? Number(units)
        : Number(units) * 100 + Number(cents.padEnd(2, "0"))
    ),
    Option.filter((amount) => amount <= maxAdAmount)
  );

/**
 * An amount in the currency's units, as a decimal: `5000` is "50.00" with
 * two digits, "5000" with none. A form field takes it, and reads it back
 * with `parseAmount`.
 */
export const decimalOf = (amount: number, digits: MinorUnitDigits): string => {
  const written = Math.trunc(Math.abs(amount)).toString();

  if (digits === 0) {
    return written;
  }

  const padded = written.padStart(3, "0");

  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
};

/**
 * An amount as money, in the reader's language: "€50.00", "50,00 €",
 * "¥5,000". A currency the engine does not know is written by its code.
 */
export const formatMoney = (
  locale: string,
  amount: number,
  currency: string,
  digits: MinorUnitDigits
): string => {
  const decimal = decimalOf(amount, digits);

  try {
    return new Intl.NumberFormat(locale, {
      currency,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
      style: "currency",
    }).format(Number(decimal));
  } catch {
    return `${decimal} ${currency}`;
  }
};

/**
 * The digits a currency's amounts are shown with, as the engine knows the
 * currency, for an amount that comes without its ad account: none for a
 * currency without a minor unit, two otherwise.
 */
export const digitsOfCurrency = (currency: string): MinorUnitDigits => {
  try {
    const { maximumFractionDigits } = new Intl.NumberFormat("en", {
      currency,
      style: "currency",
    }).resolvedOptions();

    return maximumFractionDigits === 0 ? 0 : 2;
  } catch {
    return 2;
  }
};
