import { DateTime, Duration } from "effect";
import { describe, expect, it } from "vitest";

import {
  noticeIsShort,
  retirementDay,
  retirementNotice,
} from "#billing/domain/plan-retirement.ts";

const at = (iso: string) => DateTime.makeUnsafe(iso);

const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

describe("the day a retired legacy plan ends", () => {
  it("gives 30 days' notice", () => {
    expect(Duration.toDays(retirementNotice)).toBe(30);
  });

  it("is the first midnight UTC 30 days or more after the notice, whatever the plan's period", () => {
    expect(iso(retirementDay(at("2026-11-14T10:00:00Z")))).toBe(
      "2026-12-15T00:00:00.000Z"
    );
    // A notice at midnight ends 30 days later to the second.
    expect(iso(retirementDay(at("2026-11-15T00:00:00Z")))).toBe(
      "2026-12-15T00:00:00.000Z"
    );
  });

  it("tells a notice that would give fewer than 30 days", () => {
    const day = retirementDay(at("2026-11-14T10:00:00Z"));

    expect(noticeIsShort(day, at("2026-11-15T00:00:00Z"))).toBeFalsy();
    expect(noticeIsShort(day, at("2026-11-15T00:00:01Z"))).toBeTruthy();
  });
});
