// The parameters Peal adds to Better Auth's Stripe Checkout: Stripe Tax
// always, as prices are tax-exclusive at Stripe and shown VAT included,
// and, for the trial, its days, no payment method, and a short life.
import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { checkoutParams } from "#workspace/infrastructure/auth/billing.ts";
import type {
  BillingHooks,
  CheckoutAnswer,
} from "#workspace/infrastructure/auth/billing.ts";

const workspaceId = "4e5f6a7b-8c9d-4e0f-9a1b-2c3d4e5f6a7b";

const userId = "5f6a7b8c-9d0e-4f1a-8b2c-3d4e5f6a7b8c";

const answering = (answer: CheckoutAnswer): BillingHooks => ({
  checkout: async () => await Promise.resolve(answer),
  freeWorkspace: async () => await Promise.resolve(false),
  memberAllowance: async () => await Promise.resolve(Option.none()),
  subscriptionChanged: async () => {
    await Promise.resolve();
  },
});

const paramsFor = async (answer: CheckoutAnswer) =>
  await checkoutParams(answering(answer))(
    {
      plan: { name: "pro" },
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

  it("opens the trial's checkout for 35 minutes, within its hold", async () => {
    const before = Math.floor(Date.now() / 1000);
    const { params } = await paramsFor({ _tag: "start", trialDays: 14 });

    expect(params).toMatchObject({
      automatic_tax: { enabled: true },
      payment_method_collection: "if_required",
      subscription_data: { trial_period_days: 14 },
    });
    expect(
      "expires_at" in params ? params.expires_at : 0
    ).toBeGreaterThanOrEqual(before + 35 * 60);
  });
});
