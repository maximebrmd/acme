import {
  accountsCharge,
  accountsMonthly,
  defaultApiRequestsPerMinute,
  freeAccountsOf,
  partMonthAccountDays,
  pricingExamples,
  rateCard,
  unconfirmedMeters,
} from "peal-contract/rate-card";
import type { AccountBand, Meter } from "peal-contract/rate-card";

import type { Locale } from "./i18n/locales.ts";
import type { Messages } from "./i18n/messages.ts";

// Per-account pricing as the pricing page states it, from the contract's
// rate card, which the server bills from (a test there keeps them equal).
// Prices are US dollars excluding VAT, each also shown with France's VAT,
// in every language.
// Nothing here converts a currency: checkout does.

/** The meters whose allowance and price the page states. */
export const pricedMeters: readonly Meter[] = [
  "outboundMessages",
  "managedAds",
];

/**
 * The meters the page names without a figure, as the rate card marks
 * them (`unconfirmedMeters`): the writing assistant's allowance and prices
 * are placeholders until the owner sets them.
 */
export const comingMeters: readonly Meter[] = unconfirmedMeters;

/** X's API, passed on at X's rates: its own rows (`XRates`), no unit price. */
export const passedThroughMeters: readonly Meter[] = ["xApi"];

/** The X calls a scheduler makes, whose rates the page lists. */
export const xItems = [
  "postCreate",
  "postCreateWithUrl",
  "postRead",
  "userRead",
] as const;

export type XItem = (typeof xItems)[number];

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

/** An amount, excluding VAT and with France's VAT. */
export interface Amount {
  readonly excluded: string;
  readonly included: string;
  /** What the page writes. */
  readonly text: string;
}

const amountOf = (
  locale: Locale,
  t: PricingMessages,
  cents: number
): Amount => {
  const excluded = dollars(locale, cents);

  // Exact, not rounded to the cent: a cent's price with VAT is 1.2 cents.
  const included = dollars(
    locale,
    (cents * (100 + rateCard.displayVatRate)) / 100
  );

  return {
    excluded,
    included,
    text: fill(t.taxes.withVat, {
      excluded,
      included,
      rate: count(locale, rateCard.displayVatRate),
    }),
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
  /** None when it costs nothing. */
  readonly price: Amount | null;
  readonly text: string;
}

const exampleRow = (
  locale: Locale,
  t: PricingMessages,
  accounts: number
): ExampleRow => {
  const cents = accountsMonthly(accounts);

  if (cents === 0) {
    return {
      accounts: count(locale, accounts),
      price: null,
      text: t.ladder.free,
    };
  }

  const price = amountOf(locale, t, cents);

  return { accounts: count(locale, accounts), price, text: price.text };
};

/** A month not held in full, worked out as the invoice bills it. */
export interface PartMonth {
  readonly accountDays: string;
  readonly price: Amount;
  readonly text: string;
  readonly units: string;
}

const partMonthOf = (locale: Locale, t: PricingMessages): PartMonth => {
  const { allMonth, forDays } = pricingExamples.partMonth;
  const accountDays = partMonthAccountDays(rateCard);
  const price = amountOf(locale, t, accountsCharge(accountDays));

  const days = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "day",
      unitDisplay: "long",
    }).format(value);

  const units = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 3,
  }).format(accountDays / rateCard.daysPerMonth);

  return {
    accountDays: count(locale, accountDays),
    price,
    text: fill(t.partMonth.body, {
      accountDays: count(locale, accountDays),
      allMonth: count(locale, allMonth),
      days: count(locale, rateCard.daysPerMonth),
      extras: new Intl.ListFormat(locale, { type: "conjunction" }).format(
        forDays.map((each) => fill(t.partMonth.extra, { days: days(each) }))
      ),
      price: price.text,
      units,
    }),
    units,
  };
};

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

  // At X's rates, listed apart: nothing included, no unit price.
  if (passedThroughMeters.includes(meter)) {
    return {
      allowance: t.meters.xIncluded,
      meter,
      name,
      note,
      per,
      price: null,
      priceText: t.meters.prices[meter],
    };
  }

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

/** X's rates as the page lists them, and what bounds them. */
export interface XRates {
  readonly ceiling: string;
  readonly rates: readonly {
    readonly item: XItem;
    readonly name: string;
    readonly price: Amount;
  }[];
  readonly readOn: string;
}

const xRatesOf = (locale: Locale, t: PricingMessages): XRates => ({
  ceiling: fill(t.meters.x.ceiling, {
    ceiling: dollars(locale, rateCard.x.defaultCeiling),
  }),
  // A rate is in thousandths of a dollar: a tenth of a cent.
  rates: xItems.map((item) => ({
    item,
    name: t.meters.x.names[item],
    price: amountOf(locale, t, rateCard.x.rates[item] / 10),
  })),
  readOn: fill(t.meters.x.readOn, {
    day: new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(`${rateCard.x.ratesReadOn}T00:00:00Z`)),
  }),
});

/** Everything the pricing page states, in the reader's language. */
export interface PricingPage {
  /** The API's and the MCP server's rate limit, by standing. */
  readonly api: string;
  readonly dayRule: string;
  readonly examples: readonly ExampleRow[];
  readonly ladder: readonly LadderRow[];
  readonly lead: string;
  readonly meters: readonly MeterRow[];
  readonly partMonth: PartMonth;
  readonly storage: string;
  /** How amounts show France's VAT. */
  readonly vat: string;
  readonly x: XRates;
}

/** The pricing page's figures, from the rate card, in the reader's language. */
export const pricingPage = (
  locale: Locale,
  t: PricingMessages
): PricingPage => {
  const { bands } = rateCard.prices.usd.accounts;
  const { storage } = rateCard;

  return {
    api: fill(t.api.body, {
      onRequest: count(locale, rateCard.apiRequestsPerMinute.onRequest),
      withPaymentMethod: count(locale, defaultApiRequestsPerMinute),
      without: count(
        locale,
        rateCard.apiRequestsPerMinute.withoutPaymentMethod
      ),
    }),
    dayRule: fill(t.dayRule, {
      days: count(locale, rateCard.daysPerMonth),
      after: count(locale, rateCard.daysPerMonth + 1),
      first: count(locale, 1),
      freeDays: count(locale, freeAccountsOf(rateCard) * rateCard.daysPerMonth),
    }),
    examples: pricingExamples.fullMonths.map((accounts) =>
      exampleRow(locale, t, accounts)
    ),
    ladder: bands.map((band, index) =>
      ladderRow(locale, t, band, (bands[index - 1]?.upTo ?? 0) + 1)
    ),
    lead: fill(t.lead, { free: count(locale, freeAccountsOf(rateCard)) }),
    meters: [...pricedMeters, ...comingMeters, ...passedThroughMeters].map(
      (meter) => meterRow(locale, t, meter)
    ),
    partMonth: partMonthOf(locale, t),
    storage: fill(t.storage.body, {
      minimum: size(locale, storage.minimum),
      perAccount: size(locale, storage.perAccount),
      without: size(locale, storage.withoutPaymentMethod),
    }),
    vat: fill(t.taxes.shown, { rate: count(locale, rateCard.displayVatRate) }),
    x: xRatesOf(locale, t),
  };
};
