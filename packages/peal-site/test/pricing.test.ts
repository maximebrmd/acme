// The pricing page states the rate card, in each language: every amount,
// allowance and size comes from peal-contract/rate-card, and none is typed
// in the page or its strings.
import { readFileSync } from "node:fs";
import path from "node:path";

import { accountsMonthly, rateCard } from "peal-contract/rate-card";
import { describe, expect, it } from "vitest";

import { locales } from "../src/i18n/locales.ts";
import type { Locale } from "../src/i18n/locales.ts";
import { messages } from "../src/i18n/messages.ts";
import {
  comingMeters,
  exampleAccounts,
  pricedMeters,
  pricingPage,
} from "../src/pricing.ts";

const dollars = (locale: Locale, cents: number) =>
  new Intl.NumberFormat(locale, {
    currency: "USD",
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(cents / 100);

const withVat = (cents: number) =>
  (cents * (100 + rateCard.displayVatRate)) / 100;

const pageOf = (locale: Locale) =>
  pricingPage(locale, messages(locale).pricing);

describe("the pricing page", () => {
  it.each(locales)("prices each example from the rate card in %s", (locale) => {
    const page = pageOf(locale);

    expect(page.examples.map(({ accounts }) => accounts)).toStrictEqual(
      exampleAccounts.map((count) =>
        new Intl.NumberFormat(locale).format(count)
      )
    );

    for (const [index, count] of exampleAccounts.entries()) {
      const cents = accountsMonthly(count);
      const example = page.examples[index];

      expect(example?.price.excluded).toBe(dollars(locale, cents));
      expect(example?.price.included).toBe(
        locale === "fr" ? dollars(locale, withVat(cents)) : null
      );
    }
  });

  it("shows French VAT on the French page only", () => {
    expect(pageOf("en").vat).toBeNull();
    expect(pageOf("fr").vat).toContain(String(rateCard.displayVatRate));
  });

  it.each(locales)("gives a row to each band of the ladder in %s", (locale) => {
    const { bands } = rateCard.prices.usd.accounts;
    const page = pageOf(locale);

    expect(page.ladder).toHaveLength(bands.length);

    for (const [index, band] of bands.entries()) {
      const row = page.ladder[index];

      expect(row?.price?.excluded ?? null).toBe(
        band.monthly === 0 ? null : dollars(locale, band.monthly)
      );
    }

    expect(page.ladder.at(-1)?.accounts).toContain(
      new Intl.NumberFormat(locale).format((bands.at(-2)?.upTo ?? 0) + 1)
    );
  });

  it.each(locales)(
    "states each priced meter's allowance and price in %s",
    (locale) => {
      const page = pageOf(locale);

      for (const meter of pricedMeters) {
        const row = page.meters.find((each) => each.meter === meter);
        const { cents, per } = rateCard.prices.usd.meters[meter];

        expect(row?.allowance).toContain(
          new Intl.NumberFormat(locale).format(
            rateCard.meters[meter].allowanceWithout
          )
        );
        expect(row?.price?.excluded).toBe(dollars(locale, cents));
        expect(row?.per).toBe(per);
      }
    }
  );

  it.each(locales)(
    "shows no figure for what is not decided yet in %s",
    (locale) => {
      const page = pageOf(locale);

      for (const meter of comingMeters) {
        const row = page.meters.find((each) => each.meter === meter);

        expect(row?.price).toBeNull();
        expect(row?.allowance).toBe(messages(locale).pricing.coming);
      }
    }
  );

  it("prices managed ads per ad, as its words say", () => {
    expect(rateCard.prices.usd.meters.managedAds.per).toBe(1);
  });

  it("types no figure in the page", () => {
    const page = readFileSync(
      path.join(import.meta.dirname, "../src/pages/[...locale]/pricing.astro"),
      "utf-8"
    );

    // Imports, class names and heading tags hold digits that are not
    // figures.
    const text = page
      .replaceAll(/^import .*$/gmu, "")
      .replaceAll(/class="[^"]*"/gu, "")
      .replaceAll(/<\/?h[1-6]/gu, "");

    expect(text).not.toMatch(/[\d€]/u);
  });

  it.each(locales)("types no figure in the strings in %s", (locale) => {
    // The legal notes keep their statutory periods (14 days, 30 days).
    const { legal: _legal, ...strings } = messages(locale).pricing;

    expect(JSON.stringify(strings)).not.toMatch(/[\d$€]/u);
  });
});
