import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  catalogueOf,
  catalogueProblems,
  planCatalogue,
  planLines,
} from "#billing/domain/catalogue.ts";
import type {
  CataloguePrice,
  HeldCatalogue,
  HeldMeter,
  HeldPrice,
  HeldProduct,
} from "#billing/domain/catalogue.ts";
import { rateCard } from "#billing/domain/rate-card.ts";
import { catalogueKeysOf } from "#shared/infrastructure/stripe-settings.ts";

const published = catalogueOf(catalogueKeysOf("peal"), rateCard);

const meterOf = ({ lookupKey, name }: CataloguePrice): HeldMeter => ({
  customerKey: Option.some("stripe_customer_id"),
  displayName: name,
  eventName: lookupKey,
  formula: "sum",
  id: `mtr_${lookupKey}`,
  valueKey: "value",
  window: Option.none(),
});

const productOf = ({ lookupKey, name }: CataloguePrice): HeldProduct => ({
  active: true,
  id: `prod_${lookupKey}`,
  key: lookupKey,
  name,
  taxCode: Option.some("txcd_10103001"),
});

const priceOf = (price: CataloguePrice): HeldPrice => ({
  billingScheme: price.amount._tag === "tiered" ? "tiered" : "per_unit",
  currency: "usd",
  id: `price_${price.lookupKey}`,
  interval: Option.some("month"),
  intervalCount: 1,
  lookupKey: price.lookupKey,
  meterId: Option.some(`mtr_${price.lookupKey}`),
  productId: `prod_${price.lookupKey}`,
  taxBehavior: Option.some("exclusive"),
  tiers:
    price.amount._tag === "tiered"
      ? price.amount.tiers.map(({ unitAmountDecimal, upTo }) => ({
          flatAmountDecimal: Option.none(),
          unitAmountDecimal: Option.some(unitAmountDecimal),
          upTo,
        }))
      : [],
  tiersMode: Option.some("graduated").pipe(
    Option.filter(() => price.amount._tag === "tiered")
  ),
  transformed: false,
  unitAmountDecimal:
    price.amount._tag === "perUnit"
      ? Option.some(price.amount.unitAmountDecimal)
      : Option.none(),
  usageType: Option.some("metered"),
});

// A Stripe account that holds the whole catalogue as it should be.
const complete: HeldCatalogue = {
  meters: published.map(meterOf),
  prices: published.map(priceOf),
  products: published.map(productOf),
};

const changing = (
  lookupKey: string,
  change: (price: HeldPrice) => HeldPrice
): HeldCatalogue => ({
  ...complete,
  prices: complete.prices.map((price) =>
    price.lookupKey === lookupKey ? change(price) : price
  ),
});

describe(catalogueOf, () => {
  it("lists six prices in dollars, the account ladder first, from the rate card", () => {
    expect(
      published.map(({ amount, currency, lookupKey, name }) => ({
        amount,
        currency,
        lookupKey,
        name,
      }))
    ).toStrictEqual([
      {
        amount: {
          _tag: "tiered",
          tiers: [
            { unitAmountDecimal: "0", upTo: 60 },
            { unitAmountDecimal: "16.666666666667", upTo: 300 },
            { unitAmountDecimal: "10", upTo: 3000 },
            { unitAmountDecimal: "3.333333333333", upTo: null },
          ],
        },
        currency: "usd",
        lookupKey: "peal_accounts",
        name: "Connected accounts",
      },
      {
        amount: { _tag: "perUnit", unitAmountDecimal: "1" },
        currency: "usd",
        lookupKey: "peal_assistant_requests",
        name: "Writing assistant requests",
      },
      {
        amount: { _tag: "perUnit", unitAmountDecimal: "5" },
        currency: "usd",
        lookupKey: "peal_assistant_images",
        name: "Writing assistant images",
      },
      {
        amount: { _tag: "perUnit", unitAmountDecimal: "0.01" },
        currency: "usd",
        lookupKey: "peal_outbound_messages",
        name: "Inbox messages sent",
      },
      {
        amount: { _tag: "perUnit", unitAmountDecimal: "1" },
        currency: "usd",
        lookupKey: "peal_managed_ads",
        name: "Managed ads",
      },
      {
        amount: { _tag: "perUnit", unitAmountDecimal: "0.1" },
        currency: "usd",
        lookupKey: "peal_x_api",
        name: "X API usage at X's rates",
      },
    ]);
  });
});

describe(catalogueProblems, () => {
  it("finds nothing wrong with a catalogue as the rate card gives it", () => {
    expect(catalogueProblems(published, complete)).toStrictEqual([]);
  });

  it("reads a decimal as its value, whatever its trailing zeros", () => {
    expect(
      catalogueProblems(
        published,
        changing("peal_outbound_messages", (price) => ({
          ...price,
          unitAmountDecimal: Option.some("0.010000000000"),
        }))
      )
    ).toStrictEqual([]);
  });

  it("names each price and meter Stripe lacks", () => {
    expect(
      catalogueProblems(published, {
        ...complete,
        meters: complete.meters.filter(
          ({ eventName }) => eventName !== "peal_managed_ads"
        ),
        prices: complete.prices.filter(
          ({ lookupKey }) => lookupKey !== "peal_x_api"
        ),
      })
    ).toStrictEqual([
      "peal_managed_ads: Stripe has no active meter with this event name",
      "peal_x_api: Stripe has no active price with this lookup key",
    ]);
  });

  it("names each way a price differs from the rate card's", () => {
    expect(
      catalogueProblems(
        published,
        changing("peal_assistant_images", (price) => ({
          ...price,
          currency: "eur",
          interval: Option.some("year"),
          intervalCount: 3,
          meterId: Option.some("mtr_other"),
          taxBehavior: Option.some("inclusive"),
          transformed: true,
          unitAmountDecimal: Option.some("6"),
          usageType: Option.some("licensed"),
        }))
      )
    ).toStrictEqual([
      "peal_assistant_images: Stripe charges it in eur, not usd",
      "peal_assistant_images: Stripe bills it every 3 years, not each month",
      "peal_assistant_images: Stripe bills it by licensed quantity, not by metered usage",
      "peal_assistant_images: Stripe reads its usage from meter mtr_other, not from the meter of event peal_assistant_images",
      "peal_assistant_images: its tax behavior at Stripe is inclusive, not exclusive, so the VAT would not be added to it",
      "peal_assistant_images: Stripe divides or rounds its usage before pricing it",
      "peal_assistant_images: Stripe charges 6 cents a unit, the rate card 5",
    ]);
  });

  it("names a ladder whose tiers differ", () => {
    expect(
      catalogueProblems(
        published,
        changing("peal_accounts", (price) => ({
          ...price,
          tiers: price.tiers.map((tier) =>
            tier.upTo === 300
              ? { ...tier, unitAmountDecimal: Option.some("16.67") }
              : tier
          ),
        }))
      )
    ).toStrictEqual([
      "peal_accounts: Stripe's tiers are up to 60 at 0, up to 300 at 16.67, up to 3000 at 10, then 3.333333333333 cents a unit; the rate card's up to 60 at 0, up to 300 at 16.666666666667, up to 3000 at 10, then 3.333333333333",
    ]);

    expect(
      catalogueProblems(
        published,
        changing("peal_accounts", (price) => ({
          ...price,
          tiersMode: Option.some("volume"),
        }))
      )
    ).toStrictEqual([
      "peal_accounts: Stripe prices its tiers by volume, not graduated",
    ]);

    expect(
      catalogueProblems(
        published,
        changing("peal_accounts", (price) => ({
          ...price,
          tiers: price.tiers.map((tier) => ({
            ...tier,
            flatAmountDecimal: Option.some("100"),
          })),
        }))
      )
    ).toHaveLength(1);
  });

  it("names a meter that would not count as the reporter sends", () => {
    expect(
      catalogueProblems(published, {
        ...complete,
        meters: complete.meters.map((meter) =>
          meter.eventName === "peal_accounts"
            ? {
                ...meter,
                customerKey: Option.none(),
                formula: "count",
                valueKey: "quantity",
              }
            : meter
        ),
      })
    ).toStrictEqual([
      "peal_accounts: its meter aggregates by count, not sum",
      "peal_accounts: its meter finds the customer otherwise than by the id in stripe_customer_id",
      "peal_accounts: its meter reads the value from quantity, not value",
    ]);
  });

  // Stripe keeps only the last event of each window on such a meter: the
  // increments the server sends would be lost.
  it("names a meter that keeps only the last event of each day or hour", () => {
    expect(
      catalogueProblems(published, {
        ...complete,
        meters: complete.meters.map((meter) =>
          meter.eventName === "peal_accounts"
            ? { ...meter, window: Option.some("day") }
            : meter
        ),
      })
    ).toStrictEqual([
      "peal_accounts: its meter is pre-aggregated by day, so Stripe keeps only the last event of each day",
    ]);
  });

  it("names a price whose interval is not one month", () => {
    expect(
      catalogueProblems(
        published,
        changing("peal_x_api", (price) => ({ ...price, intervalCount: 3 }))
      )
    ).toStrictEqual([
      "peal_x_api: Stripe bills it every 3 months, not each month",
    ]);
  });
});

describe(planCatalogue, () => {
  it("creates six meters, six products and six prices in an empty account", () => {
    const plan = planCatalogue(published, {
      meters: [],
      prices: [],
      products: [],
    });

    expect(plan.blocked).toStrictEqual([]);
    expect(plan.steps.map(({ _tag }) => _tag).toSorted()).toStrictEqual([
      ...Array.from({ length: 6 }, () => "createMeter"),
      ...Array.from({ length: 6 }, () => "createPrice"),
      ...Array.from({ length: 6 }, () => "createProduct"),
    ]);
  });

  it("plans nothing for a catalogue as the rate card gives it", () => {
    expect(planCatalogue(published, complete)).toStrictEqual({
      blocked: [],
      notes: [],
      steps: [],
    });
  });

  it("replaces a price with other amounts by a new one, which takes its lookup key", () => {
    const plan = planCatalogue(
      published,
      changing("peal_managed_ads", (price) => ({
        ...price,
        unitAmountDecimal: Option.some("2"),
      }))
    );

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toMatchObject({
      _tag: "createPrice",
      meterId: Option.some("mtr_peal_managed_ads"),
      productId: Option.some("prod_peal_managed_ads"),
      replacing: Option.some("price_peal_managed_ads"),
    });
    expect(planLines(plan)).toStrictEqual([
      "Managed ads: a new price under peal_managed_ads, which replaces price_peal_managed_ads (left active for the subscriptions on it): Stripe charges 2 cents a unit, the rate card 1",
    ]);
  });

  it("creates a price on a new meter when its meter is missing", () => {
    const plan = planCatalogue(published, {
      ...complete,
      meters: complete.meters.filter(
        ({ eventName }) => eventName !== "peal_x_api"
      ),
    });

    expect(plan.steps.map(({ _tag }) => _tag)).toStrictEqual([
      "createMeter",
      "createPrice",
    ]);
    expect(plan.steps[1]).toMatchObject({ meterId: Option.none() });
  });

  // The operator may rename a product or give it another tax code: the
  // command sets them when it makes the product, never after.
  it("leaves a product's name and tax code as the operator set them, saying so", () => {
    const plan = planCatalogue(published, {
      ...complete,
      products: complete.products.map((product) =>
        product.key === "peal_accounts"
          ? {
              ...product,
              name: "Accounts",
              taxCode: Option.some("txcd_10103000"),
            }
          : product
      ),
    });

    expect(plan.steps).toStrictEqual([]);
    expect(plan.blocked).toStrictEqual([]);
    expect(plan.notes).toStrictEqual([
      "Connected accounts: product prod_peal_accounts is named Accounts at Stripe, with tax code txcd_10103000; left as they are (the command gives a product it makes txcd_10103001)",
    ]);
  });

  it("changes nothing while a price's product is archived, and says which", () => {
    const plan = planCatalogue(published, {
      ...complete,
      products: complete.products.map((product) =>
        product.key === "peal_managed_ads"
          ? { ...product, active: false }
          : product
      ),
    });

    expect(plan.blocked).toStrictEqual([
      "peal_managed_ads: price price_peal_managed_ads is on product prod_peal_managed_ads, which is archived at Stripe, where checkout would refuse it. Restore the product at Stripe, then run this again.",
    ]);
  });

  it("makes a new product for a new price when the line's product is archived", () => {
    const plan = planCatalogue(published, {
      ...complete,
      prices: complete.prices.filter(
        ({ lookupKey }) => lookupKey !== "peal_managed_ads"
      ),
      products: complete.products.map((product) =>
        product.key === "peal_managed_ads"
          ? { ...product, active: false }
          : product
      ),
    });

    expect(plan.blocked).toStrictEqual([]);
    expect(plan.steps.map(({ _tag }) => _tag)).toStrictEqual([
      "createProduct",
      "createPrice",
    ]);
  });

  it("changes nothing past a meter that cannot be changed, and says why", () => {
    const plan = planCatalogue(published, {
      ...complete,
      meters: complete.meters.map((meter) =>
        meter.eventName === "peal_accounts"
          ? { ...meter, formula: "last" }
          : meter
      ),
    });

    expect(plan.blocked).toStrictEqual([
      `peal_accounts: its meter aggregates by last, not sum. Stripe cannot change a meter: deactivate meter mtr_peal_accounts at Stripe, then run this again. Subscriptions on a price that reads it stop counting from then until they move to the new price. If Stripe refuses the new meter its event name, set STRIPE_LOOKUP_KEY_PREFIX to a new prefix and give Stripe the catalogue and the plans' prices under it.`,
    ]);
  });
});
