import { Effect } from "effect";
import { maxAdAmount } from "peal-contract";

import { Refused } from "#refused.ts";

/** How many decimal digits a currency's unit has over its minor unit. */
export type MinorUnitDigits = 0 | 2;

/**
 * An amount of minor units as people read it, with its currency:
 * `50.00 EUR`, `5000 JPY`. Written from the integer's digits, never
 * divided, so nothing rounds.
 */
export const money = (
  amount: number,
  currency: string,
  digits: MinorUnitDigits
): string => {
  const sign = amount < 0 ? "-" : "";
  const written = String(Math.abs(amount)).padStart(digits + 1, "0");

  return digits === 0
    ? `${sign}${written} ${currency}`
    : `${sign}${written.slice(0, -digits)}.${written.slice(-digits)} ${currency}`;
};

// An amount as it is typed: digits, then at most a point and more digits.
const typed = /^(?<whole>\d{1,13})(?:\.(?<fraction>\d+))?$/u;

const refuse = (reason: string) => Effect.fail(new Refused({ reason }));

/**
 * The amount a flag names, in the currency's minor units: `50` and `50.00`
 * are 5000 for a currency with two decimals, `50` is 50 for one with none.
 * Read from the digits typed, never through a float, and refused when it
 * is finer than the currency goes, is zero, or is not an amount.
 */
export const minorUnits = (
  given: string,
  currency: string,
  digits: MinorUnitDigits,
  flag: string
): Effect.Effect<number, Refused> => {
  const { fraction = "", whole } = typed.exec(given.trim())?.groups ?? {};

  if (whole === undefined) {
    return refuse(
      `${flag} takes an amount in ${currency}, written with digits and at most a point, such as 50 or 50.00: not ${given}.`
    );
  }

  if (fraction.length > digits) {
    return refuse(
      digits === 0
        ? `${currency} has no smaller unit: ${flag} takes a whole amount, not ${given}.`
        : `${currency} goes to ${String(digits)} decimals: ${flag} ${given} is finer than that.`
    );
  }

  const amount = Number(`${whole}${fraction.padEnd(digits, "0")}`);

  if (amount === 0) {
    return refuse(`${flag} takes an amount above zero.`);
  }

  return amount > maxAdAmount
    ? refuse(`${flag} ${given} is more than Peal keeps.`)
    : Effect.succeed(amount);
};
