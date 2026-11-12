import { Schema } from "effect";

export { withDisplayVat } from "./billing-plans.ts";

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
]).annotate({ identifier: "Meter" });

export type Meter = typeof MeterSchema.Type;

/** The currencies a rate card is published in. */
export const RateCardCurrencySchema = Schema.Literals(["usd"]).annotate({
  identifier: "RateCardCurrency",
});

export type RateCardCurrency = typeof RateCardCurrencySchema.Type;

/** A band of the account ladder: accounts up to `upTo` (null: no end). */
export const AccountBandSchema = Schema.Struct({
  // Cents per account and month.
  monthly: Schema.Int,
  upTo: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "AccountBand" });

export type AccountBand = typeof AccountBandSchema.Type;

/** A unit price: `cents` for every `per` units. */
export const UnitPriceSchema = Schema.Struct({
  cents: Schema.Int,
  per: Schema.Int,
}).annotate({ identifier: "UnitPrice" });

export type UnitPrice = typeof UnitPriceSchema.Type;

/**
 * A meter's free units per billing account and calendar month (UTC),
 * across every workspace it pays for, then the price of each unit past
 * them. Without a payment method nothing is billed: the meter pauses at
 * its allowance, and one whose allowance there is null needs a payment
 * method before any use.
 */
export const MeterRateSchema = Schema.Struct({
  allowance: Schema.Struct({
    withPaymentMethod: Schema.Int,
    withoutPaymentMethod: Schema.NullOr(Schema.Int),
  }),
  price: UnitPriceSchema,
}).annotate({ identifier: "MeterRate" });

export type MeterRate = typeof MeterRateSchema.Type;

/**
 * Every price, band, allowance and default of per-account pricing, in one
 * currency, as the server's billing context holds it
 * (src/billing/domain/rate-card.ts, the source; a test keeps them equal).
 * Prices are cents excluding tax, billed monthly for the month past.
 */
export const RateCardSchema = Schema.Struct({
  accounts: Schema.Struct({
    // The graduated ladder, from a billing account's first connected
    // account, across every workspace it pays for.
    bands: Schema.Array(AccountBandSchema),
    // An account-day costs this fraction of the monthly rate.
    daysPerMonth: Schema.Int,
    // The most accounts a billing account connects until it paid an
    // invoice.
    unverifiedCeiling: Schema.Int,
  }),
  // API requests a minute, per key and per application; with a payment
  // method, the server's setting decides.
  apiRequestsPerMinute: Schema.Struct({
    onRequest: Schema.Int,
    withoutPaymentMethod: Schema.Int,
  }),
  currency: RateCardCurrencySchema,
  // The VAT rate, in percent, prices are shown with beside: France's.
  displayVatRate: Schema.Int,
  meters: Schema.Struct({
    assistantImages: MeterRateSchema,
    assistantRequests: MeterRateSchema,
    managedAds: MeterRateSchema,
    outboundMessages: MeterRateSchema,
    xApi: MeterRateSchema,
  }),
  // Media stored, in decimal bytes (fair use, not billed).
  storage: Schema.Struct({
    minimum: Schema.Int,
    perAccount: Schema.Int,
    withoutPaymentMethod: Schema.Int,
  }),
  x: Schema.Struct({
    // What a billing account spends on X a month unless it changes it, in
    // cents.
    defaultCeiling: Schema.Int,
    // X's published pay-per-use rates, in thousandths of a dollar.
    rates: Schema.Struct({
      dmCreate: Schema.Int,
      dmEventRead: Schema.Int,
      ownedRead: Schema.Int,
      postCreate: Schema.Int,
      postCreateWithUrl: Schema.Int,
      postRead: Schema.Int,
      userRead: Schema.Int,
    }),
  }),
}).annotate({ identifier: "RateCard" });

export type RateCard = typeof RateCardSchema.Type;

const gigabytes = (count: number): number => count * 1_000_000_000;

/**
 * Placeholders awaiting the owner's decision, as the server marks them:
 * the assistant's allowances with a payment method and its prices, the X
 * ceiling, the account ceiling before a first paid invoice, storage, and
 * the API's rate limits.
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

/** Peal Cloud's published rate cards, by currency: US dollars only, for now. */
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

/** How many of `quantity` fall in each band, its bounds times `scale`. */
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
 * What `accountDays` cost, in cents: one `daysPerMonth`th of a band's rate
 * per account-day, each band's amount rounded half up to the cent.
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

/** What `billable` units of `meter` cost, in cents, rounded half up. */
export const meterCharge = (
  meter: Meter,
  billable: number,
  card: RateCard = rateCard
): number => {
  const { cents, per } = card.meters[meter].price;

  return roundedHalfUp(billable * cents, per);
};
