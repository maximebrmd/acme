import {
  displayVatRate,
  planCatalogue,
  withDisplayVat,
} from "peal-contract/billing-plans";
import type { LegacyPlan, PlanLimit } from "peal-contract/billing-plans";
import {
  accountsMonthly,
  freeAccountsOf,
  rateCard,
} from "peal-contract/rate-card";

// Prices and limits as docs variables, from the contract: the legacy
// plans' (`{{starter-month-en}}` and the like) from its plan catalogue, and
// per-account pricing's from its rate card, which the server bills from:
// the billing pages never copy a price by hand.

const locales = ["en", "fr"] as const;

type Locale = (typeof locales)[number];

// The legacy plans still held by subscriptions: the free plan's limits
// gave way to the free tier.
const plans: readonly LegacyPlan[] = ["starter", "pro", "business", "agency"];

const limits: readonly PlanLimit[] = [
  "channels",
  "members",
  "scheduledPosts",
  "assistantRequests",
  "mediaStorage",
];

const unlimited: Readonly<Record<Locale, string>> = {
  en: "unlimited",
  fr: "illimité",
};

const money = (locale: Locale, cents: number) =>
  new Intl.NumberFormat(locale, { currency: "EUR", style: "currency" }).format(
    cents / 100
  );

const size = (locale: Locale, bytes: number) =>
  bytes >= 1_000_000_000
    ? new Intl.NumberFormat(locale, { style: "unit", unit: "gigabyte" }).format(
        bytes / 1_000_000_000
      )
    : new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte" }).format(
        bytes / 1_000_000
      );

const limitValue = (locale: Locale, limit: PlanLimit, value: number | null) => {
  if (value === null) {
    return unlimited[locale];
  }

  return limit === "mediaStorage"
    ? size(locale, value)
    : new Intl.NumberFormat(locale).format(value);
};

const planVariables = (
  plan: LegacyPlan,
  locale: Locale
): [string, string][] => {
  const { limits: allowed, price } = planCatalogue[plan];

  const prices: [string, string][] =
    price === null
      ? []
      : [
          [
            `${plan}-month-${locale}`,
            money(locale, withDisplayVat(price.month)),
          ],
          [`${plan}-month-excl-${locale}`, money(locale, price.month)],
          [`${plan}-year-${locale}`, money(locale, withDisplayVat(price.year))],
          [`${plan}-year-excl-${locale}`, money(locale, price.year)],
        ];

  return [
    ...prices,
    ...limits.map((limit): [string, string] => [
      `${plan}-${limit}-${locale}`,
      limitValue(locale, limit, allowed[limit]),
    ]),
  ];
};

// US dollars, to the cent, or finer for a price below a cent with VAT.
const dollars = (locale: Locale, cents: number) =>
  new Intl.NumberFormat(locale, {
    currency: "USD",
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(cents / 100);

const count = (locale: Locale, value: number) =>
  new Intl.NumberFormat(locale).format(value);

// English pages show dollars excluding tax; French pages also show each
// amount with France's VAT, still in dollars, not rounded to the cent.
const amount = (locale: Locale, cents: number): string => {
  const excluded = dollars(locale, cents);

  if (locale === "en") {
    return excluded;
  }

  const included = dollars(locale, (cents * (100 + displayVatRate)) / 100);

  return `${included} TTC (${excluded} HT)`;
};

const free: Readonly<Record<Locale, string>> = {
  en: "free",
  fr: "gratuit",
};

/** The accounts the billing page prices a month for. */
const exampleAccounts: readonly number[] = [2, 5, 10, 20, 50, 100, 1000];

// Per-account pricing's figures, from the rate card: each band of the
// ladder (`accounts-band-2-en`, from `accounts-band-2-from` to
// `accounts-band-2-to`), what a month costs with some accounts connected
// all month (`accounts-10-en`), the meters' allowances and prices, and the
// media each billing account stores.
const rateCardVariables = (locale: Locale): [string, string][] => {
  const { bands } = rateCard.prices.usd.accounts;
  const { meters, storage } = rateCard;
  const prices = rateCard.prices.usd.meters;

  return [
    ...bands.map(({ monthly }, index): [string, string] => [
      `accounts-band-${index + 1}-${locale}`,
      monthly === 0 ? free[locale] : amount(locale, monthly),
    ]),
    ...exampleAccounts.map((accounts): [string, string] => [
      `accounts-${accounts}-${locale}`,
      amount(locale, accountsMonthly(accounts)),
    ]),
    [
      `messages-allowance-${locale}`,
      count(locale, meters.outboundMessages.allowanceWithout),
    ],
    [`messages-price-${locale}`, amount(locale, prices.outboundMessages.cents)],
    [`messages-per-${locale}`, count(locale, prices.outboundMessages.per)],
    [
      `ads-allowance-${locale}`,
      count(locale, meters.managedAds.allowanceWithout),
    ],
    [`ads-price-${locale}`, amount(locale, prices.managedAds.cents)],
    [`free-storage-${locale}`, size(locale, storage.withoutPaymentMethod)],
    [`storage-per-account-${locale}`, size(locale, storage.perAccount)],
    [`storage-minimum-${locale}`, size(locale, storage.minimum)],
  ];
};

// The bounds of each band of the ladder, the same in every language: the
// last band has no end.
const bandVariables = (): [string, string][] =>
  rateCard.prices.usd.accounts.bands.flatMap(
    ({ upTo }, index, bands): [string, string][] => {
      const from: [string, string] = [
        `accounts-band-${index + 1}-from`,
        String((bands[index - 1]?.upTo ?? 0) + 1),
      ];

      return upTo === null
        ? [from]
        : [from, [`accounts-band-${index + 1}-to`, String(upTo)]];
    }
  );

/**
 * The legacy plans' prices and limits, and per-account pricing's figures,
 * in each language, by variable name.
 */
export const pricingVariables: Readonly<Record<string, string>> =
  Object.fromEntries([
    ...plans.flatMap((plan) =>
      locales.flatMap((locale) => planVariables(plan, locale))
    ),
    ...locales.flatMap(rateCardVariables),
    ...bandVariables(),
    ["days-per-month", String(rateCard.daysPerMonth)],
    ["free-accounts", String(freeAccountsOf(rateCard))],
    ["vat-rate", String(displayVatRate)],
  ]);
