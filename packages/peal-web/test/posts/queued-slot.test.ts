import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import { queuedSlotFormat, queuedSlotWeek } from "#posts/queued-slot.ts";

// A slot at 09:30 in Paris on Monday 15 June 2026.
const slot = {
  at: DateTime.makeUnsafe("2026-06-15T07:30:00Z"),
  timeZone: "Europe/Paris",
};

describe(queuedSlotFormat, () => {
  it("names the queue's zone beside the slot's time", () => {
    expect(
      new Intl.DateTimeFormat("en-GB", queuedSlotFormat(slot.timeZone)).format(
        DateTime.toDate(slot.at)
      )
    ).toBe("15 Jun 2026, 09:30 CEST");
  });
});

describe(queuedSlotWeek, () => {
  it("is the slot's date, read in the zone the calendar is shown in", () => {
    expect(queuedSlotWeek(slot, "Europe/Paris")).toStrictEqual({
      day: 15,
      month: 6,
      year: 2026,
    });
    // Late on the Sunday before, in Honolulu.
    expect(queuedSlotWeek(slot, "Pacific/Honolulu")).toStrictEqual({
      day: 14,
      month: 6,
      year: 2026,
    });
  });
});
