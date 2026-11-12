import {
  billingCurrency,
  displayVatRate,
  planCatalogue,
  trialOffer,
  withDisplayVat,
} from "peal-contract/billing-plans";
import type {
  LegacyPlan,
  PlanLimit,
  PlanLimits,
  PlanPrices,
} from "peal-contract/billing-plans";

import type { Locale } from "./i18n/locales.ts";
import type { Messages } from "./i18n/messages.ts";

// The plans as the pricing page lists them, from the contract's catalogue,
// which the server bills from (a test there keeps them equal).

/** The plans, from the smallest. */
export const pricedPlans: readonly LegacyPlan[] = [
  "free",
  "starter",
  "pro",
  "business",
  "agency",
];

const limitOrder: readonly PlanLimit[] = [
  "channels",
  "members",
  "scheduledPosts",
  "assistantRequests",
  "mediaStorage",
];

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

const money = (locale: Locale) => (cents: number) =>
  new Intl.NumberFormat(locale, {
    currency: billingCurrency.toUpperCase(),
    style: "currency",
  }).format(cents / 100);

const size = (locale: Locale, bytes: number) =>
  bytes >= gigabyte
    ? new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "gigabyte",
      }).format(bytes / gigabyte)
    : new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "megabyte",
      }).format(bytes / 1_000_000);

const count = (locale: Locale, value: number) =>
  new Intl.NumberFormat(locale).format(value);

/** A paid plan's prices, written out. */
export interface PlanCardPrices {
  readonly monthly: string;
  readonly monthlyExcluded: string;
  readonly perChannel: string;
  readonly yearly: string;
  readonly yearlyExcluded: string;
  readonly yearlyMonthly: string;
}

/** What one plan's card says. */
export interface PlanCard {
  readonly limits: readonly string[];
  readonly name: string;
  readonly plan: LegacyPlan;
  /** None for the free plan. */
  readonly prices?: PlanCardPrices;
}

const limitLine = (
  locale: Locale,
  t: Messages["pricing"],
  limit: PlanLimit,
  value: number | null
): string => {
  if (value === null) {
    return t.unlimited[limit];
  }

  return fill(t.limits[limit], {
    count:
      limit === "mediaStorage" ? size(locale, value) : count(locale, value),
  });
};

const pricesOf = (
  locale: Locale,
  t: Messages["pricing"],
  price: PlanPrices,
  limits: PlanLimits
): PlanCardPrices => {
  const format = money(locale);
  const monthly = withDisplayVat(price.month);
  const yearly = withDisplayVat(price.year);
  const channels = limits.channels ?? 1;

  return {
    monthly: fill(t.monthly, { price: format(monthly) }),
    monthlyExcluded: fill(t.excluded, { price: format(price.month) }),
    perChannel: fill(t.perChannel, {
      price: format(Math.round(monthly / channels)),
    }),
    yearly: fill(t.yearly, { price: format(yearly) }),
    yearlyExcluded: fill(t.excluded, { price: format(price.year) }),
    yearlyMonthly: fill(t.yearlyMonthly, {
      price: format(Math.round(yearly / 12)),
    }),
  };
};

/** Every plan's card, in the reader's language. */
export const planCards = (
  locale: Locale,
  t: Messages["pricing"]
): readonly PlanCard[] =>
  pricedPlans.map((plan) => {
    const { limits, price } = planCatalogue[plan];

    const card: PlanCard = {
      limits: limitOrder.map((limit) =>
        limitLine(locale, t, limit, limits[limit])
      ),
      name: t.plans[plan],
      plan,
    };

    if (price === null) {
      return card;
    }

    const paid: PlanCard = {
      ...card,
      prices: pricesOf(locale, t, price, limits),
    };

    return paid;
  });

/** The page's notes that name the VAT rate and the trial. */
export const pricingNotes = (t: Messages["pricing"]) => ({
  trial: fill(t.trial, {
    days: String(trialOffer.days),
    plan: t.plans[trialOffer.plan],
  }),
  vat: fill(t.vat, { rate: String(displayVatRate) }),
});
