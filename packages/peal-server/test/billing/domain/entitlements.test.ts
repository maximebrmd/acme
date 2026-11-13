import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { entitlementsOf, unmetered } from "#billing/domain/entitlements.ts";
import { planAllowances } from "#billing/domain/legacy-plans.ts";
import { allowancesOf, unlimited } from "#billing/domain/plans.ts";
import { stillBills, Subscription } from "#billing/domain/subscription.ts";
import type { SubscriptionStatus } from "#billing/domain/subscription.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

const workspaceId = WorkspaceIdSchema.make(
  "0f5b8c1e-2a3d-4e6f-8a9b-1c2d3e4f5a6b"
);

let count = 0;

const subscription = (
  plan: PaidPlan,
  status: SubscriptionStatus,
  fields: Partial<Pick<Subscription, "paidInvoiceAt">> = {}
) => {
  count += 1;

  return new Subscription({
    ...fields,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Option.some(DateTime.makeUnsafe("2026-12-09T00:00:00Z")),
    currentPeriodStart: Option.none(),
    interval: "month",
    plan,
    startedAt: Option.none(),
    status,
    stripeCustomerId: "cus_synthetic",
    stripeSubscriptionId: `sub_synthetic_${count}`,
    trialEnd: Option.none(),
    workspaceId,
  });
};

describe(entitlementsOf, () => {
  it("puts a workspace without a subscription on the free plan", () => {
    const free = entitlementsOf([]);

    expect(free.plan).toStrictEqual(Option.some("free"));
    expect(free.subscription).toStrictEqual(Option.none());
    expect(free.allowancesFor(0)).toStrictEqual(
      allowancesOf("free", { accounts: 0, freeTier: true })
    );
    expect(free.allowanceOf("channels")).toStrictEqual(Option.some(2));
  });

  it.each<SubscriptionStatus>(["active", "trialing", "past_due"])(
    "gives the plan of a subscription %s",
    (status) => {
      const pro = subscription("pro", status);

      expect(entitlementsOf([pro]).plan).toStrictEqual(Option.some("pro"));
      expect(entitlementsOf([pro]).subscription).toStrictEqual(
        Option.some(pro)
      );
    }
  );

  it.each<SubscriptionStatus>([
    "incomplete",
    "incomplete_expired",
    "canceled",
    "unpaid",
    "paused",
  ])("gives nothing for a subscription %s", (status) => {
    expect(
      entitlementsOf([subscription("business", status)]).plan
    ).toStrictEqual(Option.some("free"));
  });

  it("takes the larger plan when two subscriptions give one", () => {
    const pro = subscription("pro", "active");
    const business = subscription("business", "trialing");

    expect(entitlementsOf([pro, business]).plan).toStrictEqual(
      Option.some("business")
    );
    expect(entitlementsOf([business, pro]).subscription).toStrictEqual(
      Option.some(business)
    );
  });

  it("puts per-account pricing above a legacy plan held with it", () => {
    const agency = subscription("agency", "active");
    const payAsYouGo = subscription("payAsYouGo", "active");

    for (const held of [
      [agency, payAsYouGo],
      [payAsYouGo, agency],
    ]) {
      const entitlements = entitlementsOf(held);

      expect(entitlements.plan).toStrictEqual(Option.some("payAsYouGo"));
      expect(entitlements.subscription).toStrictEqual(Option.some(payAsYouGo));
      expect(entitlements.allowanceOf("channels")).toStrictEqual(Option.none());
    }
  });

  it("keeps a legacy plan's own allowances", () => {
    const entitlements = entitlementsOf([subscription("agency", "active")]);

    expect(entitlements.allowancesFor(40)).toStrictEqual(planAllowances.agency);
  });

  it("gives per-account pricing storage by the accounts connected", () => {
    const entitlements = entitlementsOf([subscription("payAsYouGo", "active")]);

    expect(entitlements.allowancesFor(3).mediaStorage).toStrictEqual(
      Option.some(15_000_000_000)
    );
    expect(entitlements.allowanceOf("assistantRequests")).toStrictEqual(
      Option.some(20)
    );
  });

  it("gives no free account once staff required a payment method", () => {
    expect(entitlementsOf([], false).allowanceOf("channels")).toStrictEqual(
      Option.some(0)
    );
    expect(
      entitlementsOf([subscription("payAsYouGo", "active")], false).allowanceOf(
        "channels"
      )
    ).toStrictEqual(Option.none());
  });

  it("puts a workspace back on the free tier when per-account pricing is unpaid", () => {
    expect(
      entitlementsOf([subscription("payAsYouGo", "unpaid")]).plan
    ).toStrictEqual(Option.some("free"));
    expect(
      entitlementsOf([subscription("payAsYouGo", "past_due")]).plan
    ).toStrictEqual(Option.some("payAsYouGo"));
  });

  it("holds per-account pricing to the unverified ceiling when connecting, until its first invoice is paid", () => {
    const unpaid = subscription("payAsYouGo", "active");

    const paid = subscription("payAsYouGo", "active", {
      paidInvoiceAt: Option.some(DateTime.makeUnsafe("2026-12-01T01:00:00Z")),
    });

    expect(entitlementsOf([unpaid]).connectableAccounts()).toStrictEqual(
      Option.some(100)
    );
    expect(entitlementsOf([paid]).connectableAccounts()).toStrictEqual(
      Option.none()
    );
    // The standing reads the plan's own allowance: what is connected
    // already is never over the ceiling.
    expect(entitlementsOf([unpaid]).allowanceOf("channels")).toStrictEqual(
      Option.none()
    );
  });

  it("lifts the ceiling for an account that paid an invoice before, as one that subscribes again", () => {
    const before = subscription("payAsYouGo", "canceled", {
      paidInvoiceAt: Option.some(DateTime.makeUnsafe("2026-10-01T01:00:00Z")),
    });

    expect(
      entitlementsOf([
        before,
        subscription("payAsYouGo", "active"),
      ]).connectableAccounts()
    ).toStrictEqual(Option.none());
  });

  it("connects what any other plan allows", () => {
    expect(entitlementsOf([]).connectableAccounts()).toStrictEqual(
      Option.some(2)
    );
    expect(
      entitlementsOf([subscription("agency", "active")]).connectableAccounts()
    ).toStrictEqual(planAllowances.agency.channels);
    expect(unmetered.connectableAccounts()).toStrictEqual(Option.none());
  });

  it("keeps a new subscription's plan when an old one ended", () => {
    expect(
      entitlementsOf([
        subscription("business", "canceled"),
        subscription("pro", "active"),
      ]).plan
    ).toStrictEqual(Option.some("pro"));
  });
});

describe(stillBills, () => {
  it.each<SubscriptionStatus>([
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "paused",
  ])("counts a subscription %s, which Stripe may still bill", (status) => {
    expect(stillBills(subscription("pro", status))).toBeTruthy();
  });

  it.each<SubscriptionStatus>(["canceled", "incomplete", "incomplete_expired"])(
    "leaves out a subscription %s",
    (status) => {
      expect(stillBills(subscription("pro", status))).toBeFalsy();
    }
  );
});

describe("a server that does not bill", () => {
  it("limits nothing", () => {
    expect(unmetered.plan).toStrictEqual(Option.none());
    expect(unmetered.allowancesFor(1000)).toStrictEqual(unlimited);
  });
});
