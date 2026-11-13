import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import {
  accountDayIdentifier,
  accountDaysOf,
  nextAccountMonthly,
  stampOf,
  unreportedOf,
} from "#billing/domain/account-days.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const at = (written: string) => DateTime.makeUnsafe(written);

const holder = WorkspaceIdSchema.make("6a0c2f9e-2b9b-4d34-9d3c-8b1a2f3c4d5e");

describe("account-days", () => {
  it("names a day's report by the holder, the day and the peak it reaches", () => {
    expect(accountDayIdentifier(holder, day("2026-11-13"), 7)).toBe(
      "acc:6a0c2f9e-2b9b-4d34-9d3c-8b1a2f3c4d5e:2026-11-13:7"
    );
    expect(
      accountDayIdentifier(holder, day("2026-11-13"), 7).length
    ).toBeLessThanOrEqual(100);
  });

  it("reports what a day's peak bills and was not reported yet", () => {
    expect(unreportedOf({ day: day("2026-11-13"), peak: 5, reported: 3 })).toBe(
      2
    );
    expect(unreportedOf({ day: day("2026-11-13"), peak: 3, reported: 3 })).toBe(
      0
    );
    // The 31st bills nothing, whatever the peak.
    expect(unreportedOf({ day: day("2026-12-31"), peak: 9, reported: 0 })).toBe(
      0
    );
  });

  it("adds up the account-days of a month, the 31st left out", () => {
    const days = Array.from({ length: 31 }, (_, index) => ({
      day: day(`2026-12-${String(index + 1).padStart(2, "0")}`),
      peak: 10,
    }));

    expect(accountDaysOf(days)).toBe(300);
    expect(accountDaysOf([])).toBe(0);
  });

  it("prices one more account at the ladder's band it falls in", () => {
    // The first two are free, the third costs $5, the eleventh $3, the
    // hundred and first $1.
    expect(nextAccountMonthly(0)).toBe(0);
    expect(nextAccountMonthly(1)).toBe(0);
    expect(nextAccountMonthly(2)).toBe(500);
    expect(nextAccountMonthly(10)).toBe(300);
    expect(nextAccountMonthly(100)).toBe(100);
  });

  it("stamps an event with its instant within the last hour, else with the sending time", () => {
    const now = at("2026-11-13T12:00:00Z");

    expect(stampOf(at("2026-11-13T11:30:00Z"), now)).toStrictEqual(
      at("2026-11-13T11:30:00Z")
    );
    expect(stampOf(at("2026-11-13T11:00:00Z"), now)).toStrictEqual(
      at("2026-11-13T11:00:00Z")
    );
    expect(stampOf(at("2026-11-13T10:59:59Z"), now)).toStrictEqual(now);
    expect(stampOf(at("2026-10-01T00:00:00Z"), now)).toStrictEqual(now);
    // Never ahead of the sending time.
    expect(stampOf(at("2026-11-13T12:10:00Z"), now)).toStrictEqual(now);
  });
});
