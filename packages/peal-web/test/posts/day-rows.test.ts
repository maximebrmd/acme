import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import type { QueueSlot } from "peal-contract";

import {
  dayRows,
  offsetChangesOn,
  queueSlotsOn,
  slotStartOf,
} from "#posts/day-rows.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const on = (year: number, month: number, day: number): CalendarDate => ({
  day,
  month,
  year,
});

const queue = (id: string, timeZone: string, slots: readonly QueueSlot[]) => ({
  id,
  name: `Queue ${id}`,
  slots,
  timeZone,
});

const isoOf = (slots: readonly { readonly at: DateTime.Utc }[]) =>
  slots.map(({ at }) => DateTime.formatIso(at));

// 29 March 2026: Paris moves from 02:00 to 03:00 (UTC+1 to UTC+2), a day of
// 23 hours. 25 October 2026: it goes back from 03:00 to 02:00, 25 hours.
const springForward = on(2026, 3, 29);
const fallBack = on(2026, 10, 25);

describe(queueSlotsOn, () => {
  it("places each slot of the day on its queue's clock", () => {
    const slots = queueSlotsOn(
      [
        queue("a", "Europe/Paris", [
          { day: "sunday", time: "09:00" },
          { day: "monday", time: "09:00" },
        ]),
      ],
      springForward,
      "Europe/Paris"
    );

    expect(isoOf(slots)).toStrictEqual(["2026-03-29T07:00:00.000Z"]);
    expect(slots[0]?.queueId).toBe("a");
  });

  it("moves a slot the clocks skip to the moment they jump, once", () => {
    const slots = queueSlotsOn(
      [
        queue("a", "Europe/Paris", [
          { day: "sunday", time: "02:00" },
          { day: "sunday", time: "02:30" },
          { day: "sunday", time: "03:00" },
        ]),
      ],
      springForward,
      "Europe/Paris"
    );

    // 02:00, 02:30 and 03:00 are all 03:00 that day.
    expect(isoOf(slots)).toStrictEqual(["2026-03-29T01:00:00.000Z"]);
  });

  it("gives a repeated time the earlier offset, so it happens once", () => {
    const slots = queueSlotsOn(
      [queue("a", "Europe/Paris", [{ day: "sunday", time: "02:30" }])],
      fallBack,
      "Europe/Paris"
    );

    expect(isoOf(slots)).toStrictEqual(["2026-10-25T00:30:00.000Z"]);
  });

  it("reads a queue in another zone, whose day is not the viewer's", () => {
    // New York is on UTC-4 in late March, Paris on UTC+2 once it jumped.
    const slots = queueSlotsOn(
      [
        queue("ny", "America/New_York", [
          // Sunday 05:30 in Paris.
          { day: "saturday", time: "23:30" },
          // Sunday 21:00 in Paris.
          { day: "sunday", time: "15:00" },
          // Monday 01:00 in Paris: another day.
          { day: "sunday", time: "19:00" },
        ]),
      ],
      springForward,
      "Europe/Paris"
    );

    expect(isoOf(slots)).toStrictEqual([
      "2026-03-29T03:30:00.000Z",
      "2026-03-29T19:00:00.000Z",
    ]);
  });

  // Kiritimati is on UTC+14 and Pago Pago on UTC-11: 25 hours apart.
  it("reads a queue's slots in zones more than a day apart", () => {
    const tenth = on(2026, 6, 10);

    expect(
      isoOf(
        queueSlotsOn(
          // Monday 8 June 23:30 in Pago Pago: 9 June 10:30 UTC, the
          // viewer's 10 June 00:30.
          [queue("p", "Pacific/Pago_Pago", [{ day: "monday", time: "23:30" }])],
          tenth,
          "Pacific/Kiritimati"
        )
      )
    ).toStrictEqual(["2026-06-09T10:30:00.000Z"]);

    expect(
      isoOf(
        queueSlotsOn(
          // Friday 12 June 00:30 in Kiritimati: 11 June 10:30 UTC, the
          // viewer's 10 June 23:30.
          [
            queue("k", "Pacific/Kiritimati", [
              { day: "friday", time: "00:30" },
            ]),
          ],
          tenth,
          "Pacific/Pago_Pago"
        )
      )
    ).toStrictEqual(["2026-06-11T10:30:00.000Z"]);
  });

  it("ignores a queue whose zone does not exist", () => {
    expect(
      queueSlotsOn(
        [queue("a", "Mars/Olympus", [{ day: "sunday", time: "09:00" }])],
        springForward,
        "Europe/Paris"
      )
    ).toStrictEqual([]);
  });
});

const post = (id: string, queueId: string | null) => ({ id, queueId });

const slot = (iso: string, queueId: string) => ({
  at: utc(iso),
  queueId,
  queueName: `Queue ${queueId}`,
});

describe(dayRows, () => {
  it("lists posts and slots by time, a slot its own post holds once", () => {
    const rows = dayRows(
      [
        { at: utc("2026-03-29T09:00:00Z"), post: post("late", null) },
        { at: utc("2026-03-29T07:00:00Z"), post: post("queued", "a") },
        { at: utc("2026-03-29T07:00:00Z"), post: post("same-time", null) },
      ],
      [
        slot("2026-03-29T07:00:00Z", "a"),
        slot("2026-03-29T07:00:00Z", "b"),
        slot("2026-03-29T08:00:00Z", "a"),
      ],
      [{ at: utc("2026-03-29T07:00:00Z"), postId: "queued", queueId: "a" }]
    );

    expect(
      rows.map(({ at, heldSlots, openSlots, posts }) => ({
        at: DateTime.formatIso(at),
        held: heldSlots.map(({ queueId }) => queueId),
        open: openSlots.map(({ queueId }) => queueId),
        posts: posts.map((placed) => placed.post.id),
      }))
    ).toStrictEqual([
      {
        at: "2026-03-29T07:00:00.000Z",
        held: [],
        open: ["b"],
        posts: ["queued", "same-time"],
      },
      { at: "2026-03-29T08:00:00.000Z", held: [], open: ["a"], posts: [] },
      { at: "2026-03-29T09:00:00.000Z", held: [], open: [], posts: ["late"] },
    ]);
  });

  it("shows a slot whose post the filters hide as held, never free", () => {
    const rows = dayRows(
      [],
      [slot("2026-03-29T07:00:00Z", "a")],
      [{ at: utc("2026-03-29T07:00:00Z"), postId: "hidden", queueId: "a" }]
    );

    expect(
      rows.map(({ heldSlots, openSlots, posts }) => ({
        held: heldSlots.map(({ queueId }) => queueId),
        open: openSlots.length,
        posts: posts.length,
      }))
    ).toStrictEqual([{ held: ["a"], open: 0, posts: 0 }]);
  });

  it("has no row on a day with nothing", () => {
    expect(dayRows([], [], [])).toStrictEqual([]);
  });
});

describe(slotStartOf, () => {
  it("starts a post at a slot on the viewer's clock", () => {
    expect(
      slotStartOf(utc("2026-03-29T07:00:00Z"), "Europe/Paris")
    ).toStrictEqual(
      Option.some({ date: springForward, time: { hour: 9, minute: 0 } })
    );
  });

  // 25 October 2026 in Paris: 02:30 comes twice, and a time written on the
  // clock is read with the earlier offset, so the second has no start.
  it("starts none at a time the clocks show twice, once it is the second", () => {
    expect(
      Option.isSome(slotStartOf(utc("2026-10-25T00:30:00Z"), "Europe/Paris"))
    ).toBeTruthy();
    expect(
      slotStartOf(utc("2026-10-25T01:30:00Z"), "Europe/Paris")
    ).toStrictEqual(Option.none());
  });
});

describe(offsetChangesOn, () => {
  it("tells the days the clocks change on", () => {
    expect(offsetChangesOn(springForward, "Europe/Paris")).toBeTruthy();
    expect(offsetChangesOn(fallBack, "Europe/Paris")).toBeTruthy();
    expect(offsetChangesOn(on(2026, 3, 30), "Europe/Paris")).toBeFalsy();
    expect(offsetChangesOn(springForward, "UTC")).toBeFalsy();
  });
});
