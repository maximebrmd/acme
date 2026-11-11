import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import type { Queue } from "peal-contract";

import {
  defaultQueueOf,
  queueDetailsOf,
  queueDraftOf,
  slotsInWeek,
  timetableChanged,
  withoutSlot,
  withSlot,
} from "#queues/slots.ts";

const queue = (fields: Partial<Queue>): Queue => ({
  channelIds: [],
  channelSetId: null,
  createdAt: DateTime.makeUnsafe("2026-11-01T09:00:00Z"),
  id: "q1",
  isDefault: false,
  name: "Weekdays",
  slots: [],
  timeZone: "Europe/Paris",
  unavailableChannelIds: [],
  ...fields,
});

describe(slotsInWeek, () => {
  it("orders a week's slots by day from Monday, then by time", () => {
    expect(
      slotsInWeek([
        { day: "sunday", time: "08:00" },
        { day: "monday", time: "17:30" },
        { day: "monday", time: "09:00" },
      ])
    ).toStrictEqual([
      { day: "monday", time: "09:00" },
      { day: "monday", time: "17:30" },
      { day: "sunday", time: "08:00" },
    ]);
  });
});

describe(withSlot, () => {
  it("adds a slot once, and takes one out", () => {
    const added = withSlot([{ day: "monday", time: "09:00" }], {
      day: "monday",
      time: "09:00",
    });

    expect(added).toHaveLength(1);
    expect(withoutSlot(added, { day: "monday", time: "09:00" })).toStrictEqual(
      []
    );
  });
});

describe(queueDetailsOf, () => {
  it("writes a queue as the API takes it, once it may be saved", () => {
    expect(
      queueDetailsOf({
        channelIds: ["c1"],
        channelSetId: "",
        isDefault: true,
        name: " Weekdays ",
        slots: [{ day: "monday", time: "09:00" }],
        timeZone: "Europe/Paris",
      })
    ).toStrictEqual(
      Option.some({
        channelIds: ["c1"],
        isDefault: true,
        name: "Weekdays",
        slots: [{ day: "monday", time: "09:00" }],
        timeZone: "Europe/Paris",
      })
    );
  });

  it("refuses a queue without a name", () => {
    expect(
      queueDetailsOf({
        channelIds: [],
        channelSetId: "s1",
        isDefault: false,
        name: "  ",
        slots: [],
        timeZone: "UTC",
      })
    ).toStrictEqual(Option.none());
  });

  it("starts the form from a queue, without its channels disconnected since", () => {
    expect(
      queueDraftOf(
        queue({
          channelIds: ["c1", "gone"],
          channelSetId: "s1",
          unavailableChannelIds: ["gone"],
        })
      )
    ).toStrictEqual({
      channelIds: ["c1"],
      channelSetId: "s1",
      isDefault: false,
      name: "Weekdays",
      slots: [],
      timeZone: "Europe/Paris",
    });
  });
});

describe(defaultQueueOf, () => {
  it("takes the default queue, or the first", () => {
    const first = queue({ id: "a" });
    const preferred = queue({ id: "b", isDefault: true });

    expect(defaultQueueOf([first, preferred])).toStrictEqual(
      Option.some(preferred)
    );
    expect(defaultQueueOf([first])).toStrictEqual(Option.some(first));
    expect(defaultQueueOf([])).toStrictEqual(Option.none());
  });
});

describe(timetableChanged, () => {
  const before = queue({
    slots: [
      { day: "monday", time: "09:00" },
      { day: "tuesday", time: "09:00" },
    ],
  });

  const saved = (fields: Partial<Queue>) => ({
    name: "Weekdays",
    slots: before.slots,
    timeZone: before.timeZone,
    ...fields,
  });

  it("is false for a save that keeps the slots and the zone, whatever their order or the name", () => {
    expect(
      timetableChanged(
        before,
        saved({
          name: "Mornings",
          slots: [
            { day: "tuesday", time: "09:00" },
            { day: "monday", time: "09:00" },
          ],
        })
      )
    ).toBeFalsy();
  });

  it("is true for another slot or another zone", () => {
    expect(
      timetableChanged(
        before,
        saved({ slots: [{ day: "monday", time: "09:00" }] })
      )
    ).toBeTruthy();
    expect(
      timetableChanged(before, saved({ timeZone: "Asia/Tokyo" }))
    ).toBeTruthy();
  });
});
