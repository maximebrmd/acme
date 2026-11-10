import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { planAllowances, unlimited } from "#billing/domain/plans.ts";
import {
  excessesOf,
  mustReduce,
  planHolding,
} from "#billing/domain/standing.ts";

const held = (channels: number, members: number, mediaStorage = 0) => ({
  channels,
  mediaStorage,
  members,
});

describe(excessesOf, () => {
  it("finds nothing over while the workspace is within its plan", () => {
    expect(
      excessesOf(planAllowances.free, held(3, 2, 500_000_000))
    ).toStrictEqual([]);
    expect(excessesOf(unlimited, held(500, 500))).toStrictEqual([]);
  });

  it("lists what a workspace holds beyond a plan, as after its trial", () => {
    expect(
      excessesOf(planAllowances.free, held(8, 5, 2_000_000_000))
    ).toStrictEqual([
      { allowed: 3, limit: "channels", used: 8 },
      { allowed: 2, limit: "members", used: 5 },
      { allowed: 500_000_000, limit: "mediaStorage", used: 2_000_000_000 },
    ]);
  });
});

describe(mustReduce, () => {
  it("asks to come back within the plan for channels and members", () => {
    expect(
      mustReduce(excessesOf(planAllowances.free, held(4, 2)))
    ).toBeTruthy();
    expect(
      mustReduce(excessesOf(planAllowances.free, held(3, 3)))
    ).toBeTruthy();
  });

  it("leaves a workspace over its storage to its media library", () => {
    expect(
      mustReduce(excessesOf(planAllowances.free, held(3, 2, 600_000_000)))
    ).toBeFalsy();
  });
});

describe(planHolding, () => {
  it("names the smallest paid plan that holds everything the workspace has", () => {
    expect(planHolding(held(8, 5))).toStrictEqual(Option.some("pro"));
    expect(planHolding(held(3, 3))).toStrictEqual(Option.some("starter"));
    expect(planHolding(held(4, 4))).toStrictEqual(Option.some("pro"));
    expect(planHolding(held(1, 1, 30_000_000_000))).toStrictEqual(
      Option.some("business")
    );
  });

  it("names none past the largest plan", () => {
    expect(planHolding(held(101, 1))).toStrictEqual(Option.none());
  });
});
