import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { meterView } from "#billing/api/billing-view.ts";
import type { MeterMonth } from "#billing/domain/meter-claims.ts";

// X's meter of a paying account this month, its ceiling paying for 2,500
// units past an allowance of none.
const xMonth: MeterMonth = {
  allowance: 0,
  billable: 40,
  ceiling: Option.some(250),
  charge: 4,
  group: Option.some("x"),
  meter: "xApi",
  most: Option.some(2500),
  resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
  used: 40,
};

describe(meterView, () => {
  it("tells the workspace that bills the account the most its ceiling pays for", () => {
    expect(meterView(xMonth, true).most).toBe(2500);
  });

  it("tells any other workspace no more than the allowance, which says nothing of the ceiling", () => {
    expect(meterView(xMonth, false).most).toBe(0);
    expect(meterView({ ...xMonth, most: Option.none() }, false).most).toBe(0);
    expect(
      meterView(
        {
          ...xMonth,
          allowance: 10_000,
          meter: "outboundMessages",
          most: Option.some(4000),
        },
        false
      ).most
    ).toBe(4000);
  });
});
