import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { planAllowances } from "#billing/domain/legacy-plans.ts";
import {
  allowancesOf,
  largerPlan,
  legacyPlans,
  planToPay,
  planWithRoom,
} from "#billing/domain/plans.ts";
import { listedPriceOf } from "#billing/domain/prices.ts";

const gigabytes = (count: number) => count * 1_000_000_000;

describe(allowancesOf, () => {
  it("gives the free tier 2 accounts, 1 GB and no assistant, nothing else limited", () => {
    expect(allowancesOf("free", { accounts: 0, freeTier: true })).toStrictEqual(
      {
        assistantRequests: Option.some(0),
        channels: Option.some(2),
        mediaStorage: Option.some(gigabytes(1)),
        members: Option.none(),
        scheduledPosts: Option.none(),
      }
    );
  });

  it("gives no free account once staff required a payment method", () => {
    expect(
      allowancesOf("free", { accounts: 0, freeTier: false }).channels
    ).toStrictEqual(Option.some(0));
  });

  it("gives per-account pricing every account and 5 GB an account, 5 GB at least", () => {
    for (const freeTier of [true, false]) {
      expect(
        allowancesOf("payAsYouGo", { accounts: 3, freeTier })
      ).toStrictEqual({
        assistantRequests: Option.some(20),
        channels: Option.none(),
        mediaStorage: Option.some(gigabytes(15)),
        members: Option.none(),
        scheduledPosts: Option.none(),
      });
    }

    expect(
      allowancesOf("payAsYouGo", { accounts: 0, freeTier: true }).mediaStorage
    ).toStrictEqual(Option.some(gigabytes(5)));
    expect(
      allowancesOf("payAsYouGo", { accounts: 10, freeTier: true }).mediaStorage
    ).toStrictEqual(Option.some(gigabytes(50)));
  });

  it("keeps each legacy plan's own allowances", () => {
    for (const plan of ["starter", "pro", "business", "agency"] as const) {
      expect(
        allowancesOf(plan, { accounts: 7, freeTier: false })
      ).toStrictEqual(planAllowances[plan]);
    }
  });
});

describe(planWithRoom, () => {
  it("offers per-account pricing from the free tier for accounts and storage", () => {
    for (const needed of [3, 12, 1000]) {
      expect(planWithRoom("free", "channels", needed)).toStrictEqual(
        Option.some("payAsYouGo")
      );
    }

    expect(planWithRoom("free", "mediaStorage", gigabytes(400))).toStrictEqual(
      Option.some("payAsYouGo")
    );
    expect(planWithRoom("free", "assistantRequests", 1)).toStrictEqual(
      Option.some("payAsYouGo")
    );
  });

  it("offers per-account pricing from a legacy plan, never another legacy plan", () => {
    expect(planWithRoom("starter", "members", 4)).toStrictEqual(
      Option.some("payAsYouGo")
    );
    expect(planWithRoom("agency", "channels", 101)).toStrictEqual(
      Option.some("payAsYouGo")
    );
  });

  it("offers nothing that would not hold what is needed", () => {
    expect(planWithRoom("pro", "assistantRequests", 21)).toStrictEqual(
      Option.none()
    );
  });

  it("offers nothing above per-account pricing", () => {
    expect(planWithRoom("payAsYouGo", "channels", 4)).toStrictEqual(
      Option.none()
    );
    expect(
      planWithRoom("payAsYouGo", "mediaStorage", gigabytes(100))
    ).toStrictEqual(Option.none());
  });
});

describe(largerPlan, () => {
  it("ranks per-account pricing above every legacy plan", () => {
    for (const plan of ["starter", "pro", "business", "agency"] as const) {
      expect(largerPlan(plan, "payAsYouGo")).toBe("payAsYouGo");
      expect(largerPlan("payAsYouGo", plan)).toBe("payAsYouGo");
    }

    expect(largerPlan("pro", "business")).toBe("business");
  });
});

describe(planToPay, () => {
  it("orders per-account pricing, the only plan sold", () => {
    expect(planToPay()).toBe("payAsYouGo");
  });

  it("never names a plan whose listed price would read as nothing", () => {
    expect(listedPriceOf(planToPay(), "month")).toStrictEqual(Option.none());
  });
});

describe("the legacy plans", () => {
  it("are listed without per-account pricing, priced as they were", () => {
    expect(legacyPlans).not.toContain("payAsYouGo");
    expect(listedPriceOf("payAsYouGo", "month")).toStrictEqual(Option.none());
    expect(listedPriceOf("pro", "year")).toStrictEqual(Option.some(12_500));
  });

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
});
