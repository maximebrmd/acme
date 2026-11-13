import {
  accountsMonthly,
  freeAccountsOf,
  rateCard,
} from "peal-contract/rate-card";
import type { AccountBand, Meter } from "peal-contract/rate-card";

import type { Locale } from "./i18n/locales.ts";
import type { Messages } from "./i18n/messages.ts";

// Per-account pricing as the pricing page states it, from the contract's
// rate card, which the server bills from (a test there keeps them equal).
// Prices are US dollars excluding tax; a locale whose strings ask for it
// (French) also shows each amount with France's VAT, still in dollars.
// Nothing here converts a currency: checkout does.

/** The accounts the page prices a month for, each connected all month. */
export const exampleAccounts: readonly number[] = [2, 5, 10, 20, 50, 100, 1000];

/** The meters whose allowance and price the page states. */
export const pricedMeters: readonly Meter[] = [
  "outboundMessages",
  "managedAds",
];

/**
 * The meters the page names without a figure: the writing assistant's
 * allowance and prices are placeholders in the rate card until the owner
 * sets them, and X's pass-through is not billed yet. Move a meter to
 * `pricedMeters` once its figures are final.
 */
export const comingMeters: readonly Meter[] = [
  "assistantRequests",
  "assistantImages",
  "xApi",
];

type PricingMessages = Messages["pricing"];

const gigabyte = 1_000_000_000;

// `{name}` in a template, filled from `values`.
const fill = (
  template: string,
  values: Readonly<Record<string, string>>
): string =>
  template.replaceAll(
    /\{(?<name>\w+)\}/gu,
    (whole, name: string) => values[name] ?? whole
  );

// Dollars, to the cent, or finer for a price below a cent with VAT.
const dollars = (locale: Locale, cents: number) =>
  new Intl.NumberFormat(locale, {
    currency: "USD",
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(cents / 100);

const count = (locale: Locale, value: number) =>
  new Intl.NumberFormat(locale).format(value);

const size = (locale: Locale, bytes: number) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: "unit",
    unit: "gigabyte",
  }).format(bytes / gigabyte);

/** An amount, excluding tax, and with France's VAT where the page shows it. */
export interface Amount {
  readonly excluded: string;
  readonly included: string | null;
  /** What the page writes. */
  readonly text: string;
}

const amountOf = (
  locale: Locale,
  t: PricingMessages,
  cents: number
): Amount => {
  const excluded = dollars(locale, cents);

  if (!t.taxes.showVat) {
    return { excluded, included: null, text: excluded };
  }

  // Exact, not rounded to the cent: a cent's price with VAT is 1.2 cents.
  const included = dollars(
    locale,
    (cents * (100 + rateCard.displayVatRate)) / 100
  );

  return {
    excluded,
    included,
    text: fill(t.taxes.withVat, { excluded, included }),
  };
};

/** A band of the account ladder. */
export interface LadderRow {
  readonly accounts: string;
  /** None for the free band. */
  readonly price: Amount | null;
  readonly text: string;
}

const ladderRow = (
  locale: Locale,
  t: PricingMessages,
  band: AccountBand,
  from: number
): LadderRow => {
  const accounts =
    band.upTo === null
      ? fill(t.ladder.last, { from: count(locale, from) })
      : fill(t.ladder.range, {
          from: count(locale, from),
          to: count(locale, band.upTo),
        });

  if (band.monthly === 0) {
    return { accounts, price: null, text: t.ladder.free };
  }

  const price = amountOf(locale, t, band.monthly);

  return {
    accounts,
    price,
    text: fill(t.ladder.perAccount, { price: price.text }),
  };
};

/** What a month costs with some accounts connected all month. */
export interface ExampleRow {
  readonly accounts: string;
  readonly price: Amount;
}

/** A meter: what a month includes, and what each unit past it costs. */
export interface MeterRow {
  readonly allowance: string;
  readonly meter: Meter;
  readonly name: string;
  readonly note: string | null;
  readonly per: number;
  /** None while its figures are not final. */
  readonly price: Amount | null;
  readonly priceText: string | null;
}

const meterRow = (
  locale: Locale,
  t: PricingMessages,
  meter: Meter
): MeterRow => {
  const name = t.meters.names[meter];
  const note = t.meters.notes[meter];
  const { cents, per } = rateCard.prices.usd.meters[meter];

  if (comingMeters.includes(meter)) {
    return {
      allowance: t.coming,
      meter,
      name,
      note,
      per,
      price: null,
      priceText: null,
    };
  }

  const { allowance, allowanceWithout } = rateCard.meters[meter];

  // The page states one allowance, the same with or without a payment
  // method, as every priced meter has.
  if (allowance !== allowanceWithout) {
    throw new RangeError(`The page states one allowance for ${meter}`);
  }

  const price = amountOf(locale, t, cents);

  return {
    allowance: fill(t.meters.allowance, { count: count(locale, allowance) }),
    meter,
    name,
    note,
    per,
    price,
    priceText: fill(t.meters.prices[meter], {
      per: count(locale, per),
      price: price.text,
    }),
  };
};

/** Everything the pricing page states, in the reader's language. */
export interface PricingPage {
  readonly dayRule: string;
  readonly examples: readonly ExampleRow[];
  readonly ladder: readonly LadderRow[];
  readonly lead: string;
  readonly meters: readonly MeterRow[];
  readonly storage: string;
  /** France's VAT, on the pages that show it. */
  readonly vat: string | null;
}

/** The pricing page's figures, from the rate card, in the reader's language. */
export const pricingPage = (
  locale: Locale,
  t: PricingMessages
): PricingPage => {
  const { bands } = rateCard.prices.usd.accounts;
  const { storage } = rateCard;

  return {
    dayRule: fill(t.dayRule, {
      days: count(locale, rateCard.daysPerMonth),
      fraction: `${count(locale, 1)}/${count(locale, rateCard.daysPerMonth)}`,
    }),
    examples: exampleAccounts.map((accounts) => ({
      accounts: count(locale, accounts),
      price: amountOf(locale, t, accountsMonthly(accounts)),
    })),
    ladder: bands.map((band, index) =>
      ladderRow(locale, t, band, (bands[index - 1]?.upTo ?? 0) + 1)
    ),
    lead: fill(t.lead, { free: count(locale, freeAccountsOf(rateCard)) }),
    meters: [...pricedMeters, ...comingMeters].map((meter) =>
      meterRow(locale, t, meter)
    ),
    storage: fill(t.storage.body, {
      minimum: size(locale, storage.minimum),
      perAccount: size(locale, storage.perAccount),
      without: size(locale, storage.withoutPaymentMethod),
    }),
    vat: t.taxes.showVat
      ? fill(t.taxes.shown, { rate: count(locale, rateCard.displayVatRate) })
      : null,
  };
};
