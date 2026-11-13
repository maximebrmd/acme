import { accountsMonthly, rateCard } from "peal-contract/rate-card";
import type { RateCard } from "peal-contract/rate-card";

import { priced } from "#billing/upgrade.ts";
import type { OfferPrice } from "#billing/upgrade.ts";

/** A band of the account ladder, as the billing page lists it. */
export interface LadderRow {
  /** The band's first account. */
  readonly from: number;
  /** What each account in it costs a month. */
  readonly monthly: OfferPrice;
  /** Its last account; null for the band without an end. */
  readonly to: number | null;
}

/**
 * The account ladder of the rate card, in US dollars, band by band from a
 * billing account's first connected account: never typed.
 */
export const ladderOf = (card: RateCard = rateCard): readonly LadderRow[] =>
  card.prices.usd.accounts.bands.map(({ monthly, upTo }, index, bands) => ({
    from: (bands[index - 1]?.upTo ?? 0) + 1,
    monthly: priced(monthly),
    to: upTo,
  }));

/** The account after those connected, and what it costs a month. */
export interface NextAccount {
  /** Its place in the billing account: the third, the eleventh… */
  readonly position: number;
  readonly price: OfferPrice;
}

// A count the ladder takes: whole, zero or more.
const countOf = (accounts: number): number =>
  Number.isSafeInteger(accounts) && accounts > 0 ? accounts : 0;

/**
 * What one more account costs a month, after `accounts` connected across
 * the billing account: the band it falls in, by the ladder.
 */
export const nextAccountOf = (
  accounts: number,
  card: RateCard = rateCard
): NextAccount => {
  const connected = countOf(accounts);

  return {
    position: connected + 1,
    price: priced(
      accountsMonthly(connected + 1, "usd", card) -
        accountsMonthly(connected, "usd", card)
    ),
  };
};
