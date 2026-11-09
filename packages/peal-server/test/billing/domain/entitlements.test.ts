import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { entitlementsOf, unmetered } from "#billing/domain/entitlements.ts";
import { planAllowances, unlimited } from "#billing/domain/plans.ts";
import { stillBills, Subscription } from "#billing/domain/subscription.ts";
import type { SubscriptionStatus } from "#billing/domain/subscription.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

const workspaceId = WorkspaceIdSchema.make(
  "0f5b8c1e-2a3d-4e6f-8a9b-1c2d3e4f5a6b"
);

let count = 0;

const subscription = (plan: PaidPlan, status: SubscriptionStatus) => {
  count += 1;

  return new Subscription({
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
    expect(free.allowances).toStrictEqual(planAllowances.free);
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

describe("the plans", () => {
  it("limit less on each larger plan, and the assistant on every plan", () => {
    const { business, free, pro } = planAllowances;

    for (const limit of [
      "assistantRequests",
      "channels",
      "members",
      "scheduledPosts",
    ] as const) {
      const sizes = [free, pro, business].map((plan) =>
        Option.getOrElse(plan[limit], () => Number.POSITIVE_INFINITY)
      );

      expect(sizes).toStrictEqual(sizes.toSorted((a, b) => a - b));
      expect(Option.isSome(free[limit])).toBeTruthy();
    }

    expect(Option.isSome(business.assistantRequests)).toBeTruthy();
  });

  it("limit nothing on a server that does not bill", () => {
    expect(unmetered.plan).toStrictEqual(Option.none());
    expect(unmetered.allowances).toStrictEqual(unlimited);
  });
});
