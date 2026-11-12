import {
  displayVatRate,
  planCatalogue,
  trialOffer,
  withDisplayVat,
} from "peal-contract/billing-plans";
import type { LegacyPlan, PlanLimit } from "peal-contract/billing-plans";

// The plans' prices and limits as docs variables, `{{starter-month-en}}`
// and the like, from the contract's catalogue, which the server bills
// from: the billing pages never copy a price by hand.

const locales = ["en", "fr"] as const;

type Locale = (typeof locales)[number];

const plans: readonly LegacyPlan[] = [
  "free",
  "starter",
  "pro",
  "business",
  "agency",
];

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

/** Every plan's prices and limits, in each language, by variable name. */
export const pricingVariables: Readonly<Record<string, string>> =
  Object.fromEntries([
    ...plans.flatMap((plan) =>
      locales.flatMap((locale) => planVariables(plan, locale))
    ),
    ["trial-days", String(trialOffer.days)],
    ["vat-rate", String(displayVatRate)],
  ]);
