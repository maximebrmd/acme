import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { planAllowances } from "#billing/domain/legacy-plans.ts";
import { allowancesOf, unlimited } from "#billing/domain/plans.ts";
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

describe("the free tier", () => {
  const free = allowancesOf("free", { accounts: 0, freeTier: true });

  it("must reduce past 2 accounts, never for its members", () => {
    expect(mustReduce(excessesOf(free, held(2, 40)))).toBeFalsy();
    expect(excessesOf(free, held(3, 40))).toStrictEqual([
      { allowed: 2, limit: "channels", used: 3 },
    ]);
    expect(mustReduce(excessesOf(free, held(3, 1)))).toBeTruthy();
  });
});

describe(planHolding, () => {
  it("names per-account pricing for anything a workspace holds", () => {
    expect(planHolding(held(8, 5))).toStrictEqual(Option.some("payAsYouGo"));
    expect(planHolding(held(101, 1))).toStrictEqual(Option.some("payAsYouGo"));
    expect(planHolding(held(2, 1, 10_000_000_000))).toStrictEqual(
      Option.some("payAsYouGo")
    );
  });

  it("names none for more media than its accounts would store", () => {
    expect(planHolding(held(1, 1, 30_000_000_000))).toStrictEqual(
      Option.none()
    );
  });
});
