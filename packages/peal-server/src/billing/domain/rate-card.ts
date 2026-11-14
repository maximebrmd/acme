import { DateTime, Schema } from "effect";

import type { Meter } from "#shared/domain/meter.ts";

import { displayVatRate } from "./prices.ts";

// The meters, in the kernel since every context claims them.
export { MeterSchema } from "#shared/domain/meter.ts";

export type { Meter } from "#shared/domain/meter.ts";

/**
 * The currencies prices are listed in: US dollars only. Customers elsewhere
 * may pay in their own currency at checkout, converted by Stripe; the key
 * is kept so a list could be added, and no other is written.
 */
export const PriceCurrencySchema = Schema.Literals(["usd"]);

export type PriceCurrency = typeof PriceCurrencySchema.Type;

/** A band of the account ladder: accounts up to `upTo` (none: no end). */
export interface AccountBand {
  readonly upTo: number | null;
  /** Cents per account and month. */
  readonly monthly: number;
}

/** A unit price: `cents` for every `per` units. */
export interface UnitPrice {
  readonly cents: number;
  readonly per: number;
}

/** What is priced in one currency: the account ladder and each meter. */
export interface Prices {
  /** The graduated ladder, from a billing account's first connected account. */
  readonly accounts: { readonly bands: readonly AccountBand[] };
  /** The price of each unit past a meter's allowance. */
  readonly meters: { readonly [M in Meter]: UnitPrice };
}

/** A meter's terms, per billing account and calendar month (UTC). */
export interface MeterTerms {
  /** Units included with a payment method. */
  readonly allowance: number;
  /** Units included without one: past them, the meter pauses. */
  readonly allowanceWithout: number;
  /**
   * What may be spent past the allowance unless the account changes it,
   * in cents; null where there is no ceiling.
   */
  readonly ceiling: number | null;
}

/** X's published pay-per-use rates, in thousandths of a dollar. */
export interface XRates {
  readonly dmCreate: number;
  readonly dmEventRead: number;
  readonly ownedRead: number;
  readonly postCreate: number;
  readonly postCreateWithUrl: number;
  readonly postRead: number;
  readonly userRead: number;
}

/**
 * Every price, band, allowance and default of per-account pricing. Prices
 * exclude tax and are billed monthly, for the month past; every allowance
 * is per billing account, across the workspaces it pays for.
 */
export interface RateCard {
  /** The VAT rate, in percent, of the amount pages show beside: France's. */
  readonly displayVatRate: number;
  readonly prices: { readonly [C in PriceCurrency]: Prices };
  /** An account-day costs this fraction of the monthly rate. */
  readonly daysPerMonth: number;
  /** The most accounts a billing account connects until it paid an invoice. */
  readonly unverifiedCeiling: number;
  readonly meters: { readonly [M in Meter]: MeterTerms };
  /** The assistant's prices: its cost, plus this margin, in percent. */
  readonly assistant: { readonly margin: number };
  /** Media stored across the billing account, in decimal bytes (fair use). */
  readonly storage: {
    readonly withoutPaymentMethod: number;
    readonly perAccount: number;
    readonly minimum: number;
  };
  /**
   * API requests a minute, per key and per application. With a payment
   * method, `PEAL_API_REQUESTS_PER_MINUTE` decides.
   */
  readonly apiRequestsPerMinute: {
    readonly withoutPaymentMethod: number;
    readonly onRequest: number;
  };
  readonly x: {
    /** What a billing account spends on X a month unless it changes it, in cents. */
    readonly defaultCeiling: number;
    /**
     * X's published pay-per-use rates, passed through with nothing added:
     * the meter's unit is a thousandth of a dollar, so a rate is its units.
     */
    readonly rates: XRates;
    /**
     * The UTC day the rates were read on X's developer pricing page
     * (docs.x.com/x-api/getting-started/pricing), which carries no date of
     * its own: read it again before each release that touches them.
     */
    readonly ratesReadOn: string;
  };
}

const gigabytes = (count: number): number => count * 1_000_000_000;

/**
 * Not decided yet, kept here together. Placeholders, to be replaced with
 * the owner's figures before a pricing page shows them: the assistant's
 * allowances with a payment method, its two prices and its margin.
 * Recommended defaults awaiting confirmation: the X ceiling, the account
 * ceiling before a first paid invoice and the API's rate limits.
 */
const awaitingDecision = {
  apiRequestsPerMinute: { onRequest: 1200, withoutPaymentMethod: 60 },
  assistantImages: { allowance: 10, cents: 5 },
  assistantMargin: 30,
  assistantRequests: { allowance: 100, cents: 1 },
  unverifiedCeiling: 100,
  xCeiling: 2500,
} as const;

/**
 * The meters whose allowance and price are placeholders until the owner
 * confirms them (`awaitingDecision`): pages show them as coming, never as
 * a price.
 */
export const unconfirmedMeters: readonly Meter[] = [
  "assistantImages",
  "assistantRequests",
];

/**
 * Peal Cloud's rate card. Keep the contract's copy
 * (`peal-contract/rate-card`) equal: the site, the docs and the web app
 * read that copy.
 */
export const rateCard: RateCard = {
  apiRequestsPerMinute: awaitingDecision.apiRequestsPerMinute,
  assistant: { margin: awaitingDecision.assistantMargin },
  daysPerMonth: 30,
  displayVatRate,
  meters: {
    // Peal's own provider needs a payment method, and stops at the
    // allowance unless the account sets a ceiling.
    assistantImages: {
      allowance: awaitingDecision.assistantImages.allowance,
      allowanceWithout: 0,
      ceiling: 0,
    },
    assistantRequests: {
      allowance: awaitingDecision.assistantRequests.allowance,
      allowanceWithout: 0,
      ceiling: 0,
    },
    managedAds: { allowance: 500, allowanceWithout: 500, ceiling: null },
    outboundMessages: {
      allowance: 10_000,
      allowanceWithout: 10_000,
      ceiling: null,
    },
    // X needs a payment method: nothing is included.
    xApi: {
      allowance: 0,
      allowanceWithout: 0,
      ceiling: awaitingDecision.xCeiling,
    },
  },
  prices: {
    usd: {
      accounts: {
        bands: [
          { monthly: 0, upTo: 2 },
          { monthly: 500, upTo: 10 },
          { monthly: 300, upTo: 100 },
          { monthly: 100, upTo: null },
        ],
      },
      meters: {
        assistantImages: {
          cents: awaitingDecision.assistantImages.cents,
          per: 1,
        },
        assistantRequests: {
          cents: awaitingDecision.assistantRequests.cents,
          per: 1,
        },
        managedAds: { cents: 1, per: 1 },
        outboundMessages: { cents: 100, per: 10_000 },
        // A unit is a thousandth of a dollar of X's rates.
        xApi: { cents: 1, per: 10 },
      },
    },
  },
  // Fair use across the billing account, decided: 1 GB without a
  // payment method; with one, 5 GB per connected account, 5 GB at least.
  storage: {
    minimum: gigabytes(5),
    perAccount: gigabytes(5),
    withoutPaymentMethod: gigabytes(1),
  },
  unverifiedCeiling: awaitingDecision.unverifiedCeiling,
  x: {
    defaultCeiling: awaitingDecision.xCeiling,
    rates: {
      dmCreate: 15,
      dmEventRead: 10,
      ownedRead: 1,
      postCreate: 15,
      postCreateWithUrl: 200,
      postRead: 5,
      userRead: 10,
    },
    ratesReadOn: "2026-11-14",
  },
};

/**
 * `count` when it is a whole number, zero or more. Anything else is a bug
 * in the caller, never a price: it is refused, the same way everywhere.
 */
const counted = (count: number): number => {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(`Expected a count, got ${count}`);
  }

  return count;
};

/** `numerator / denominator`, rounded half up, for whole numbers. */
const roundedHalfUp = (numerator: number, denominator: number): number =>
  Math.floor((2 * numerator + denominator) / (2 * denominator));

/** How many of `quantity` fall in each band, its bounds times `scale`. */
const unitsByBand = (
  bands: readonly AccountBand[],
  quantity: number,
  scale: number
): readonly { readonly band: AccountBand; readonly units: number }[] =>
  bands.map((band, index) => {
    const from = (bands[index - 1]?.upTo ?? 0) * scale;
    const to = band.upTo === null ? quantity : band.upTo * scale;

    return { band, units: Math.max(0, Math.min(quantity, to) - from) };
  });

/**
 * The accounts a billing account connects for nothing, without a payment
 * method: the ladder's first bands that cost nothing (2).
 */
export const freeAccountsOf = (
  card: RateCard = rateCard,
  currency: PriceCurrency = "usd"
): number => {
  let free = 0;

  for (const { monthly, upTo } of card.prices[currency].accounts.bands) {
    if (monthly !== 0 || upTo === null) {
      break;
    }

    free = upTo;
  }

  return free;
};

/** What `accounts` connected all month cost, in cents: 10 cost 4,000. */
export const accountsMonthly = (
  accounts: number,
  currency: PriceCurrency = "usd",
  card: RateCard = rateCard
): number =>
  unitsByBand(
    card.prices[currency].accounts.bands,
    counted(accounts),
    1
  ).reduce((sum, { band, units }) => sum + units * band.monthly, 0);

/**
 * What `accountDays` cost, in cents: each band's rate divided by
 * `daysPerMonth` per account-day, the band's bounds multiplied by it, and
 * each band's amount rounded half up to the cent, as Stripe is assumed to
 * round a graduated price (not confirmed; for this ladder half up, half
 * even and rounding the total give the same amounts, as a band's
 * fractions are thirds).
 */
export const accountsCharge = (
  accountDays: number,
  currency: PriceCurrency = "usd",
  card: RateCard = rateCard
): number =>
  unitsByBand(
    card.prices[currency].accounts.bands,
    counted(accountDays),
    card.daysPerMonth
  ).reduce(
    (sum, { band, units }) =>
      sum + roundedHalfUp(units * band.monthly, card.daysPerMonth),
    0
  );

/**
 * The account-days a UTC day bills for its `peak`, the most accounts
 * connected at once: none on the 31st, so a month never bills more than
 * `daysPerMonth` days.
 */
export const billableAccountDays = (day: DateTime.Utc, peak: number): number =>
  DateTime.getPartUtc(day, "day") === 31 ? 0 : counted(peak);

/** The units of `meter` a billing account has included in a month. */
export const meterAllowance = (
  meter: Meter,
  paying: boolean,
  card: RateCard = rateCard
): number =>
  paying ? card.meters[meter].allowance : card.meters[meter].allowanceWithout;

/**
 * The units of `meter` past its monthly allowance with a payment method,
 * of the `used` units: what a billing account that pays is billed for.
 */
export const billableUnits = (
  meter: Meter,
  used: number,
  card: RateCard = rateCard
): number => Math.max(0, counted(used) - card.meters[meter].allowance);

/**
 * What `billable` units of `meter` cost, in cents, rounded half up. The
 * rule Stripe uses for a half cent (50 messages, 5 X units) is assumed,
 * not confirmed: a sandbox invoice is to settle it.
 */
export const meterCharge = (
  meter: Meter,
  billable: number,
  currency: PriceCurrency = "usd",
  card: RateCard = rateCard
): number => {
  const { cents, per } = card.prices[currency].meters[meter];

  return roundedHalfUp(counted(billable) * cents, per);
};

/**
 * The media a billing account may store, in decimal bytes: a small
 * allowance without a payment method, and with one, an allowance per
 * connected account with a floor.
 */
export const storageAllowance = (
  paying: boolean,
  accounts: number,
  card: RateCard = rateCard
): number =>
  paying
    ? Math.max(
        card.storage.minimum,
        card.storage.perAccount * counted(accounts)
      )
    : card.storage.withoutPaymentMethod;

/** A graduated tier of Stripe's account-day price. */
export interface StripeTier {
  /** Account-days up to which the tier applies; none for the last. */
  readonly upTo: number | null;
  /** Cents per account-day, at most 12 decimals, as Stripe takes them. */
  readonly unitAmountDecimal: string;
}

const stripeDecimals = 12n;

/** `cents / days`, half up to 12 decimals, without trailing zeros. */
const decimalOf = (cents: number, days: number): string => {
  const scale = 10n ** stripeDecimals;
  const divisor = BigInt(days);
  const scaled = (BigInt(cents) * scale * 2n + divisor) / (divisor * 2n);
  const whole = scaled / scale;

  const fraction = (scaled % scale)
    .toString()
    .padStart(Number(stripeDecimals), "0")
    .replace(/0+$/u, "");

  return fraction === "" ? whole.toString() : `${whole}.${fraction}`;
};

/**
 * The account ladder as Stripe's graduated tiers on account-days, derived,
 * never typed: each band's bound times `daysPerMonth`, its rate divided by
 * it.
 */
export const stripeTiersOf = (
  card: RateCard,
  currency: PriceCurrency = "usd"
): readonly StripeTier[] =>
  card.prices[currency].accounts.bands.map(({ monthly, upTo }) => ({
    unitAmountDecimal: decimalOf(monthly, card.daysPerMonth),
    upTo: upTo === null ? null : upTo * card.daysPerMonth,
  }));

/**
 * The price at Stripe of one unit of `meter` past its allowance, in cents,
 * as a decimal of at most 12 places: $1 per 10,000 messages is `0.01`.
 */
export const stripeUnitAmountOf = (
  meter: Meter,
  card: RateCard,
  currency: PriceCurrency = "usd"
): string => {
  const { cents, per } = card.prices[currency].meters[meter];

  return decimalOf(cents, per);
};
