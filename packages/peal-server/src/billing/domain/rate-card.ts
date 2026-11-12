import { DateTime, Option, Schema } from "effect";

/**
 * What a billing account pays for by use, each with a free monthly
 * allowance across every workspace it pays for: writing assistant requests
 * and images on the server's provider (none with the workspace's own),
 * inbox messages sent (comment replies included), managed ads active in
 * the month, and calls to X's API at X's rates.
 */
export const MeterSchema = Schema.Literals([
  "assistantRequests",
  "assistantImages",
  "outboundMessages",
  "managedAds",
  "xApi",
]);

export type Meter = typeof MeterSchema.Type;

/** The currencies a rate card is published in. */
export const RateCardCurrencySchema = Schema.Literals(["usd"]);

export type RateCardCurrency = typeof RateCardCurrencySchema.Type;

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

/**
 * A meter's free units per billing account and calendar month (UTC),
 * across every workspace it pays for, then the price of each unit past
 * them. Without a payment method nothing is billed: the meter pauses at
 * its allowance, and one whose allowance there is null needs a payment
 * method before any use.
 */
export interface MeterRate {
  readonly allowance: {
    readonly withPaymentMethod: number;
    readonly withoutPaymentMethod: number | null;
  };
  readonly price: UnitPrice;
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
 * Every price, band, allowance and default of per-account pricing, in one
 * currency. Prices exclude tax and are billed monthly, for the month past.
 */
export interface RateCard {
  readonly currency: RateCardCurrency;
  /** The VAT rate, in percent, prices are shown with beside: France's. */
  readonly displayVatRate: number;
  readonly accounts: {
    /**
     * The graduated ladder, from a billing account's first connected
     * account, across every workspace it pays for.
     */
    readonly bands: readonly AccountBand[];
    /** An account-day costs this fraction of the monthly rate. */
    readonly daysPerMonth: number;
    /** The most accounts a billing account connects until it paid an invoice. */
    readonly unverifiedCeiling: number;
  };
  readonly meters: { readonly [M in Meter]: MeterRate };
  /** Media stored, in decimal bytes (fair use, not billed). */
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
    readonly rates: XRates;
  };
}

const gigabytes = (count: number): number => count * 1_000_000_000;

/**
 * Placeholders awaiting the owner's decision, kept here, together, until
 * confirmed: the assistant's allowances with a payment method and its
 * prices, the X ceiling, the account ceiling before a first paid invoice,
 * storage, and the API's rate limits. Decided: the ladder, the currency,
 * messages, managed ads, X at X's rates with a payment method, and no
 * assistant on the server's provider without one.
 */
const awaitingDecision = {
  apiRequestsPerMinute: { onRequest: 1200, withoutPaymentMethod: 60 },
  assistantImages: { allowance: 10, cents: 5 },
  assistantRequests: { allowance: 100, cents: 1 },
  storage: {
    minimum: gigabytes(5),
    perAccount: gigabytes(5),
    withoutPaymentMethod: gigabytes(1),
  },
  unverifiedCeiling: 100,
  xDefaultCeiling: 2500,
} as const;

/**
 * The published rate cards, by currency: US dollars only, for now. Keep
 * the contract's copy (`peal-contract/rate-card`) equal; the site, the
 * docs and the web app read that copy.
 */
export const rateCards: Readonly<Record<RateCardCurrency, RateCard>> = {
  usd: {
    accounts: {
      bands: [
        { monthly: 0, upTo: 2 },
        { monthly: 500, upTo: 10 },
        { monthly: 300, upTo: 100 },
        { monthly: 100, upTo: null },
      ],
      daysPerMonth: 30,
      unverifiedCeiling: awaitingDecision.unverifiedCeiling,
    },
    apiRequestsPerMinute: awaitingDecision.apiRequestsPerMinute,
    currency: "usd",
    displayVatRate: 20,
    meters: {
      assistantImages: {
        allowance: {
          withPaymentMethod: awaitingDecision.assistantImages.allowance,
          withoutPaymentMethod: null,
        },
        price: { cents: awaitingDecision.assistantImages.cents, per: 1 },
      },
      assistantRequests: {
        allowance: {
          withPaymentMethod: awaitingDecision.assistantRequests.allowance,
          withoutPaymentMethod: null,
        },
        price: { cents: awaitingDecision.assistantRequests.cents, per: 1 },
      },
      managedAds: {
        allowance: { withPaymentMethod: 500, withoutPaymentMethod: 500 },
        price: { cents: 1, per: 1 },
      },
      outboundMessages: {
        allowance: { withPaymentMethod: 10_000, withoutPaymentMethod: 10_000 },
        price: { cents: 100, per: 10_000 },
      },
      // A thousandth of a dollar of X's rates a unit.
      xApi: {
        allowance: { withPaymentMethod: 0, withoutPaymentMethod: null },
        price: { cents: 1, per: 10 },
      },
    },
    storage: awaitingDecision.storage,
    x: {
      defaultCeiling: awaitingDecision.xDefaultCeiling,
      rates: {
        dmCreate: 15,
        dmEventRead: 10,
        ownedRead: 1,
        postCreate: 15,
        postCreateWithUrl: 200,
        postRead: 5,
        userRead: 10,
      },
    },
  },
};

/** The rate card Peal Cloud bills with. */
export const rateCard: RateCard = rateCards.usd;

/** `numerator / denominator`, rounded half up, for whole numbers. */
const roundedHalfUp = (numerator: number, denominator: number): number =>
  Math.floor((2 * numerator + denominator) / (2 * denominator));

/**
 * Splits `quantity` along the ladder's bands, each `upTo` scaled by
 * `scale`: how many units fall in each band.
 */
const unitsByBand = (
  card: RateCard,
  quantity: number,
  scale: number
): readonly { readonly band: AccountBand; readonly units: number }[] =>
  card.accounts.bands.map((band, index) => {
    const from = (card.accounts.bands[index - 1]?.upTo ?? 0) * scale;
    const to = band.upTo === null ? quantity : band.upTo * scale;

    return { band, units: Math.max(0, Math.min(quantity, to) - from) };
  });

/** What `accounts` connected all month cost, in cents: 10 cost 4,000. */
export const accountsMonthly = (
  accounts: number,
  card: RateCard = rateCard
): number =>
  unitsByBand(card, accounts, 1).reduce(
    (sum, { band, units }) => sum + units * band.monthly,
    0
  );

/**
 * What `accountDays` cost, in cents: each band's rate divided by
 * `daysPerMonth` per account-day, the band's bounds multiplied by it, and
 * each band's amount rounded half up to the cent, as Stripe rounds a
 * graduated price.
 */
export const accountsCharge = (
  accountDays: number,
  card: RateCard = rateCard
): number =>
  unitsByBand(card, accountDays, card.accounts.daysPerMonth).reduce(
    (sum, { band, units }) =>
      sum + roundedHalfUp(units * band.monthly, card.accounts.daysPerMonth),
    0
  );

/**
 * The account-days a UTC day bills for its `peak`, the most accounts
 * connected at once: none on the 31st, so a month never bills more than
 * `daysPerMonth` days.
 */
export const billableAccountDays = (day: DateTime.Utc, peak: number): number =>
  DateTime.getPartUtc(day, "day") === 31 ? 0 : peak;

/**
 * The free units of `meter` a billing account has in a month, with a
 * payment method or without: none when the meter needs one.
 */
export const meterAllowance = (
  meter: Meter,
  paying: boolean,
  card: RateCard = rateCard
): Option.Option<number> => {
  const { withoutPaymentMethod, withPaymentMethod } =
    card.meters[meter].allowance;

  return paying
    ? Option.some(withPaymentMethod)
    : Option.fromNullOr(withoutPaymentMethod);
};

/**
 * The units of `meter` past its monthly allowance with a payment method,
 * of the `used` units: what a billing account that pays is billed for.
 */
export const billableUnits = (
  meter: Meter,
  used: number,
  card: RateCard = rateCard
): number => Math.max(0, used - card.meters[meter].allowance.withPaymentMethod);

/** What `billable` units of `meter` cost, in cents, rounded half up. */
export const meterCharge = (
  meter: Meter,
  billable: number,
  card: RateCard = rateCard
): number => {
  const { cents, per } = card.meters[meter].price;

  return roundedHalfUp(billable * cents, per);
};

/**
 * The media a workspace may store, in decimal bytes: a small allowance
 * without a payment method, and with one, an allowance per connected
 * account with a floor.
 */
export const storageAllowance = (
  paying: boolean,
  accounts: number,
  card: RateCard = rateCard
): number =>
  paying
    ? Math.max(card.storage.minimum, card.storage.perAccount * accounts)
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
export const stripeTiersOf = (card: RateCard): readonly StripeTier[] =>
  card.accounts.bands.map(({ monthly, upTo }) => ({
    unitAmountDecimal: decimalOf(monthly, card.accounts.daysPerMonth),
    upTo: upTo === null ? null : upTo * card.accounts.daysPerMonth,
  }));
