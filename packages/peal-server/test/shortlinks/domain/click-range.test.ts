import { assert, describe, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import {
  clickRangeOf,
  daysOf,
  maxClickRangeDays,
} from "#shortlinks/domain/click-range.ts";
import { clickCutoff } from "#shortlinks/domain/click-retention.ts";

const now = DateTime.makeUnsafe("2026-11-12T15:30:00Z");
const day = (iso: string) => Option.some(DateTime.makeUnsafe(iso));

describe("the days clicks are read over", () => {
  it("are the 30 that end today unless told", () => {
    const range = Result.getOrThrow(
      clickRangeOf({ from: Option.none(), to: Option.none() }, now)
    );

    assert.strictEqual(
      DateTime.formatIso(range.from),
      "2026-10-14T00:00:00.000Z"
    );
    assert.strictEqual(
      DateTime.formatIso(range.to),
      "2026-11-12T00:00:00.000Z"
    );
    assert.lengthOf(daysOf(range), 30);
  });

  it("span 92 days at most, and never end before they start", () => {
    assert.isTrue(
      Result.isFailure(
        clickRangeOf({ from: day("2026-11-12"), to: day("2026-11-11") }, now)
      )
    );
    assert.isTrue(
      Result.isFailure(
        clickRangeOf({ from: day("2026-01-01"), to: day("2026-11-11") }, now)
      )
    );
    assert.isTrue(
      Result.isSuccess(
        clickRangeOf(
          {
            from: day("2026-08-13"),
            to: Option.some(
              DateTime.add(DateTime.makeUnsafe("2026-08-13"), {
                days: maxClickRangeDays - 1,
              })
            ),
          },
          now
        )
      )
    );
  });

  it("are kept 400 days", () => {
    assert.strictEqual(
      DateTime.formatIso(clickCutoff(now)),
      "2025-10-08T00:00:00.000Z"
    );
  });
});
