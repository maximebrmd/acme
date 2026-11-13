import { Schema } from "effect";

import { displayVatRate } from "./billing-plans.ts";
import { ByteCountSchema } from "./int64.ts";

export { withDisplayVat } from "./billing-plans.ts";

/**
 * What a billing account pays for by use, each with a monthly allowance
 * across every workspace it pays for: writing assistant requests and images
 * on the server's provider (never with a workspace's own), inbox messages
 * sent (comment replies included), managed ads active in the month, and
 * calls to X's API at X's rates.
 */
export const MeterSchema = Schema.Literals([
  "assistantRequests",
  "assistantImages",
  "outboundMessages",
  "managedAds",
  "xApi",
]).annotate({ identifier: "Meter" });

export type Meter = typeof MeterSchema.Type;

/**
 * The currencies prices are listed in: US dollars only. Customers elsewhere
 * may pay in their own currency at checkout, converted by Stripe.
 */
export const PriceCurrencySchema = Schema.Literals(["usd"]).annotate({
  identifier: "PriceCurrency",
});

export type PriceCurrency = typeof PriceCurrencySchema.Type;

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

/** What is priced in one currency: the account ladder and each meter. */
export const PricesSchema = Schema.Struct({
  // The graduated ladder, from a billing account's first connected account.
  accounts: Schema.Struct({ bands: Schema.Array(AccountBandSchema) }),
  // The price of each unit past a meter's allowance.
  meters: Schema.Struct({
    assistantImages: UnitPriceSchema,
    assistantRequests: UnitPriceSchema,
    managedAds: UnitPriceSchema,
    outboundMessages: UnitPriceSchema,
    xApi: UnitPriceSchema,
  }),
}).annotate({ identifier: "Prices" });

export type Prices = typeof PricesSchema.Type;

/** A meter's terms, per billing account and calendar month (UTC). */
export const MeterTermsSchema = Schema.Struct({
  // Units included with a payment method.
  allowance: Schema.Int,
  // Units included without one: past them, the meter pauses.
  allowanceWithout: Schema.Int,
  // What may be spent past the allowance unless the account changes it, in
  // cents; null where there is no ceiling.
  ceiling: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "MeterTerms" });

export type MeterTerms = typeof MeterTermsSchema.Type;

/**
 * Every price, band, allowance and default of per-account pricing, as the
 * server's billing context holds it (src/billing/domain/rate-card.ts, the
 * source; a test keeps them equal). Prices are cents excluding tax, billed
 * monthly for the month past; every allowance is per billing account,
 * across the workspaces it pays for.
 */
export const RateCardSchema = Schema.Struct({
  // API requests a minute, per key and per application; with a payment
  // method, the server's setting decides.
  apiRequestsPerMinute: Schema.Struct({
    onRequest: Schema.Int,
    withoutPaymentMethod: Schema.Int,
  }),
  // The assistant's prices: its cost, plus this margin, in percent.
  assistant: Schema.Struct({ margin: Schema.Int }),
  // An account-day costs this fraction of the monthly rate.
  daysPerMonth: Schema.Int,
  // The VAT rate, in percent, of the amount pages show beside: France's.
  displayVatRate: Schema.Int,
  meters: Schema.Struct({
    assistantImages: MeterTermsSchema,
    assistantRequests: MeterTermsSchema,
    managedAds: MeterTermsSchema,
    outboundMessages: MeterTermsSchema,
    xApi: MeterTermsSchema,
  }),
  prices: Schema.Struct({ usd: PricesSchema }),
  // Media stored across the billing account, in decimal bytes (fair use).
  storage: Schema.Struct({
    minimum: ByteCountSchema,
    perAccount: ByteCountSchema,
    withoutPaymentMethod: ByteCountSchema,
  }),
  // The most accounts a billing account connects until it paid an invoice.
  unverifiedCeiling: Schema.Int,
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
 * Not decided yet, as the server marks them. Placeholders, to be replaced
 * with the owner's figures before a pricing page shows them: the
 * assistant's allowances with a payment method, its two prices and its
 * margin. Recommended defaults awaiting confirmation: the X ceiling, the
 * account ceiling before a first paid invoice, storage and the API's rate
 * limits.
 */
const awaitingDecision = {
  apiRequestsPerMinute: { onRequest: 1200, withoutPaymentMethod: 60 },
  assistantImages: { allowance: 10, cents: 5 },
  assistantMargin: 30,
  assistantRequests: { allowance: 100, cents: 1 },
  storage: {
    minimum: gigabytes(5),
    perAccount: gigabytes(5),
    withoutPaymentMethod: gigabytes(1),
  },
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

/** Peal Cloud's rate card. */
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
  storage: awaitingDecision.storage,
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

/** A graduated tier of Stripe's account-day price. */
export const StripeTierSchema = Schema.Struct({
  /** Cents per account-day, at most 12 decimals, as Stripe takes them. */
  unitAmountDecimal: Schema.String,
  /** Account-days up to which the tier applies; none for the last. */
  upTo: Schema.NullOr(Schema.Int),
});

export type StripeTier = typeof StripeTierSchema.Type;

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

/**
 * The lookup keys of per-account pricing's prices at Stripe under
 * `prefix`, one per line of the invoice, each also its meter's event name,
 * as a server that bills reads them (`STRIPE_LOOKUP_KEY_PREFIX`).
 */
export const catalogueLookupKeysOf = (
  prefix: string
): { readonly accounts: string } & { readonly [M in Meter]: string } => ({
  accounts: `${prefix}_accounts`,
  assistantImages: `${prefix}_assistant_images`,
  assistantRequests: `${prefix}_assistant_requests`,
  managedAds: `${prefix}_managed_ads`,
  outboundMessages: `${prefix}_outbound_messages`,
  xApi: `${prefix}_x_api`,
});
