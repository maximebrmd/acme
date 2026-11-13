// The parameters Peal adds to Better Auth's Stripe Checkout: Stripe Tax
// always, as prices are tax-exclusive at Stripe; for per-account pricing, a
// card always, the period anchored on the first of the month (UTC), and the
// catalogue's other prices as line items, without a quantity.
import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import type { Stripe } from "stripe";

import { catalogueKeysOf } from "#shared/infrastructure/stripe-settings.ts";
import {
  catalogueLineItems,
  checkoutParams,
  firstOfNextMonth,
} from "#workspace/infrastructure/auth/billing.ts";
import type {
  BillingHooks,
  CheckoutAnswer,
} from "#workspace/infrastructure/auth/billing.ts";

const workspaceId = "4e5f6a7b-8c9d-4e0f-9a1b-2c3d4e5f6a7b";

const userId = "5f6a7b8c-9d0e-4f1a-8b2c-3d4e5f6a7b8c";

const answering = (answer: CheckoutAnswer): BillingHooks => ({
  checkout: async () => await Promise.resolve(answer),
  memberAllowance: async () => await Promise.resolve(Option.none()),
  memberUpgrade: async () =>
    await Promise.resolve({
      billingUrl: "http://localhost:3001",
      plan: "free" as const,
      planWithRoom: null,
    }),
  ownersChanged: async () => {
    await Promise.resolve();
  },
  payerOf: async () => await Promise.resolve(null),
  subscriptionChanged: async () => {
    await Promise.resolve();
  },
  workspaceCreated: async () => {
    await Promise.resolve();
  },
});

const meterItems: readonly Stripe.Checkout.SessionCreateParams.LineItem[] = [
  { price: "price_synthetic_messages" },
];

const paramsFor = async (
  answer: CheckoutAnswer,
  plan = "payAsYouGo",
  items: Option.Option<typeof meterItems> = Option.some(meterItems)
) =>
  await checkoutParams(
    answering(answer),
    async () => await Promise.resolve(items)
  )(
    {
      plan: { name: plan },
      subscription: { referenceId: workspaceId },
      user: { email: "member@example.com", id: userId },
    },
    undefined,
    { body: { metadata: { orderId: "synthetic-order" } } }
  );

describe(checkoutParams, () => {
  it("has Stripe Tax add the VAT to every checkout", async () => {
    const { params } = await paramsFor({ _tag: "start", trialDays: null });

    expect(params).toMatchObject({
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    });
  });

  it("asks for a card and bills calendar months for per-account pricing", async () => {
    const { params } = await paramsFor({ _tag: "start", trialDays: null });

    expect(params).toMatchObject({
      payment_method_collection: "always",
      subscription_data: { proration_behavior: "none" },
    });
    expect(
      "subscription_data" in params
        ? params.subscription_data?.billing_cycle_anchor
        : 0
    ).toBe(firstOfNextMonth(Date.now()));
  });

  it("opens no checkout for per-account pricing while its prices cannot be found", async () => {
    await expect(
      paramsFor({ _tag: "start", trialDays: null }, "payAsYouGo", Option.none())
    ).rejects.toMatchObject({ body: { code: "CHECKOUT_UNAVAILABLE" } });
  });
});

describe(firstOfNextMonth, () => {
  it("anchors on the next first of the month, at midnight UTC", () => {
    expect(firstOfNextMonth(Date.parse("2026-11-13T15:30:00Z"))).toBe(
      Date.parse("2026-12-01T00:00:00Z") / 1000
    );
    expect(firstOfNextMonth(Date.parse("2026-12-31T23:59:59Z"))).toBe(
      Date.parse("2027-01-01T00:00:00Z") / 1000
    );
    expect(firstOfNextMonth(Date.parse("2026-12-01T00:00:00Z"))).toBe(
      Date.parse("2027-01-01T00:00:00Z") / 1000
    );
  });
});

describe(catalogueLineItems, () => {
  const keys = catalogueKeysOf("peal");

  it("lists each meter's price by its lookup key, without a quantity", async () => {
    const asked: string[] = [];

    const items = await catalogueLineItems(
      {
        list: async ({ lookup_keys: lookupKeys }) => {
          asked.push(...(lookupKeys ?? []));

          return await Promise.resolve({
            data: (lookupKeys ?? []).map((key) => ({ id: `price_${key}` })),
          });
        },
      },
      keys
    );

    expect(asked).toStrictEqual([
      keys.outboundMessages,
      keys.managedAds,
      keys.assistantRequests,
      keys.assistantImages,
      keys.xApi,
    ]);
    expect(items).toStrictEqual(
      Option.some(asked.map((key) => ({ price: `price_${key}` })))
    );
  });

  it("finds none when a price is missing or Stripe does not answer", async () => {
    await expect(
      catalogueLineItems(
        { list: async () => await Promise.resolve({ data: [] }) },
        keys
      )
    ).resolves.toStrictEqual(Option.none());
    await expect(
      catalogueLineItems(
        { list: async () => await Promise.reject(new Error("synthetic")) },
        keys
      )
    ).resolves.toStrictEqual(Option.none());
  });
});
