import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  allowancesOf,
  legacyPlans,
  planAllowances,
  planToPay,
  planWithRoom,
} from "#billing/domain/plans.ts";
import { listedPriceOf } from "#billing/domain/prices.ts";

describe(planWithRoom, () => {
  it("offers the smallest larger plan with room for what is needed", () => {
    expect(planWithRoom("free", "channels", 4)).toStrictEqual(
      Option.some("starter")
    );
    expect(planWithRoom("free", "channels", 8)).toStrictEqual(
      Option.some("pro")
    );
    expect(planWithRoom("starter", "members", 4)).toStrictEqual(
      Option.some("pro")
    );
    expect(planWithRoom("free", "mediaStorage", 600_000_000)).toStrictEqual(
      Option.some("starter")
    );
  });

  it("never offers the plan the workspace is on, nor a smaller one", () => {
    expect(planWithRoom("pro", "channels", 4)).toStrictEqual(
      Option.some("business")
    );
    expect(planWithRoom("business", "assistantRequests", 41)).toStrictEqual(
      Option.some("agency")
    );
  });

  it("offers a plan without the limit", () => {
    expect(planWithRoom("free", "scheduledPosts", 10_000)).toStrictEqual(
      Option.some("starter")
    );
  });

  it("offers nothing past the largest plan", () => {
    expect(planWithRoom("agency", "channels", 101)).toStrictEqual(
      Option.none()
    );
    expect(planWithRoom("free", "channels", 101)).toStrictEqual(Option.none());
  });
});

describe("per-account pricing, before it is wired", () => {
  it("is held to the free plan's allowances", () => {
    expect(allowancesOf("payAsYouGo")).toStrictEqual(planAllowances.free);
    expect(allowancesOf("pro")).toStrictEqual(planAllowances.pro);
  });

  it("is offered no plan above it", () => {
    expect(planWithRoom("payAsYouGo", "channels", 4)).toStrictEqual(
      Option.none()
    );
  });

  it("is in neither the legacy plans nor their prices", () => {
    expect(legacyPlans).not.toContain("payAsYouGo");
    expect(listedPriceOf("payAsYouGo", "month")).toStrictEqual(Option.none());
    expect(listedPriceOf("pro", "year")).toStrictEqual(Option.some(12_500));
  });
});

describe(planToPay, () => {
  it("orders the smallest plan for a free workspace, and a trial's own", () => {
    expect(planToPay("free")).toBe("starter");
    expect(planToPay("pro")).toBe("pro");
  });
});
