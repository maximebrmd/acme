import {
  displayVatRate,
  planCatalogue,
  withDisplayVat,
} from "peal-contract/billing-plans";
import type { LegacyPlan, PlanLimit } from "peal-contract/billing-plans";
import {
  accountsCharge,
  accountsMonthly,
  freeAccountsOf,
  partMonthAccountDays,
  pricingExamples,
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
  en: "Free",
  fr: "Gratuit",
};

const extra: Readonly<Record<Locale, (days: string) => string>> = {
  en: (days) => `one for ${days}`,
  fr: (days) => `un pendant ${days}`,
};

// The part month the billing page works out, as `accountsCharge` bills
// it: its account-days, the accounts they make through the ladder, and
// what the month costs.
const partMonthVariables = (locale: Locale): [string, string][] => {
  const accountDays = partMonthAccountDays(rateCard);

  const days = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "day",
      unitDisplay: "long",
    }).format(value);

  return [
    [
      `part-month-all-${locale}`,
      count(locale, pricingExamples.partMonth.allMonth),
    ],
    [
      `part-month-extras-${locale}`,
      new Intl.ListFormat(locale, { type: "conjunction" }).format(
        pricingExamples.partMonth.forDays.map((each) =>
          extra[locale](days(each))
        )
      ),
    ],
    [`part-month-days-${locale}`, count(locale, accountDays)],
    [
      `part-month-units-${locale}`,
      new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(
        accountDays / rateCard.daysPerMonth
      ),
    ],
    [`part-month-${locale}`, amount(locale, accountsCharge(accountDays))],
  ];
};

// Per-account pricing's figures, from the rate card: each band of the
// ladder (`accounts-band-2-en`, from `accounts-band-2-from` to
// `accounts-band-2-to`), what a month costs with some accounts connected
// all month (`accounts-10-en`, labelled `accounts-10-count-en`), a part
// month (`part-month-en`), the meters' allowances and prices, and the
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
    ...pricingExamples.fullMonths.flatMap((accounts): [string, string][] => {
      const cents = accountsMonthly(accounts);

      return [
        [`accounts-${accounts}-count-${locale}`, count(locale, accounts)],
        [
          `accounts-${accounts}-${locale}`,
          cents === 0 ? free[locale] : amount(locale, cents),
        ],
      ];
    }),
    ...partMonthVariables(locale),
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
    ["day-not-counted", String(rateCard.daysPerMonth + 1)],
    [
      "free-account-days",
      String(freeAccountsOf(rateCard) * rateCard.daysPerMonth),
    ],
    ["free-accounts", String(freeAccountsOf(rateCard))],
    ["vat-rate", String(displayVatRate)],
  ]);
