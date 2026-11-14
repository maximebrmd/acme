import { DateTime, Duration } from "effect";
import { describe, expect, it } from "vitest";

import {
  retirementDay,
  retirementNotice,
} from "#billing/domain/plan-retirement.ts";

const at = (iso: string) => DateTime.makeUnsafe(iso);

const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

describe("the day a retired legacy plan ends", () => {
  it("gives 30 days' notice", () => {
    expect(Duration.toDays(retirementNotice)).toBe(30);
  });

  it("is its period's end when that is 30 days or more after the notice", () => {
    expect(
      iso(
        retirementDay(
          at("2026-11-14T10:00:00Z"),
          at("2026-12-14T10:00:00Z"),
          "month"
        )
      )
    ).toBe("2026-12-14T10:00:00.000Z");
    expect(
      iso(
        retirementDay(
          at("2026-11-14T10:00:00Z"),
          at("2027-03-01T00:00:00Z"),
          "year"
        )
      )
    ).toBe("2027-03-01T00:00:00.000Z");
  });

  it("is the first monthly period's end 30 days after the notice, a month renewing once or twice", () => {
    expect(
      iso(
        retirementDay(
          at("2026-11-14T10:00:00Z"),
          at("2026-12-01T00:00:00Z"),
          "month"
        )
      )
    ).toBe("2027-01-01T00:00:00.000Z");
    // February is 28 days: a period ending tomorrow renews twice.
    expect(
      iso(
        retirementDay(
          at("2027-01-31T00:00:00Z"),
          at("2027-02-01T00:00:00Z"),
          "month"
        )
      )
    ).toBe("2027-04-01T00:00:00.000Z");
  });

  it("ends a yearly plan renewing within the 30 days on the 30th day, not a year later", () => {
    expect(
      iso(
        retirementDay(
          at("2026-11-14T10:00:00Z"),
          at("2026-12-01T00:00:00Z"),
          "year"
        )
      )
    ).toBe("2026-12-14T10:00:00.000Z");
  });

  it("never comes before 30 days after the notice", () => {
    for (const end of ["2026-11-15T00:00:00Z", "2026-12-13T00:00:00Z"]) {
      for (const interval of ["month", "year"] as const) {
        const day = retirementDay(
          at("2026-11-14T10:00:00Z"),
          at(end),
          interval
        );

        expect(
          DateTime.isGreaterThanOrEqualTo(
            day,
            DateTime.addDuration(at("2026-11-14T10:00:00Z"), retirementNotice)
          )
        ).toBeTruthy();
      }
    }
  });
});
