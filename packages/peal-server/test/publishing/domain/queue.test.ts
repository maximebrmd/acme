import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { QueueIdSchema } from "#publishing/domain/queue-id.ts";
import {
  createQueue,
  nextFreeSlot,
  previewOf,
  queueHorizonDays,
  queueKeyOf,
  slotsAfter,
} from "#publishing/domain/queue.ts";
import type { QueueSlot, TakenSlots } from "#publishing/domain/queue.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import type { Weekday } from "#shared/domain/wall-clock.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");
const tokyo = TimeZoneIdSchema.make("Asia/Tokyo");

const workspaceId = WorkspaceIdSchema.make(
  "5b0d3c1e-8f2a-4c6b-9d7e-1a2b3c4d5e6f"
);

const slot = (day: Weekday, at: string): QueueSlot => {
  const [hour = 0, minute = 0] = at.split(":").map(Number);

  return { day, time: { hour, minute } };
};

const queueOf = (slots: readonly QueueSlot[], timeZone: TimeZoneId = paris) =>
  createQueue(
    QueueIdSchema.make("00000000-0000-7000-8000-000000000001"),
    workspaceId,
    {
      channelIds: [],
      channelSetId: Option.none(),
      isDefault: false,
      name: "Weekdays",
      slots,
      timeZone,
    },
    DateTime.makeUnsafe("2026-01-01T00:00:00Z")
  );

const utc = (iso: string) => DateTime.makeUnsafe(iso);

// The first `count` slots after `after`, as instants in UTC.
const firstSlots = (
  slots: readonly QueueSlot[],
  after: string,
  count: number,
  timeZone: TimeZoneId = paris
): readonly string[] => {
  const found: string[] = [];

  for (const at of slotsAfter(queueOf(slots, timeZone), utc(after))) {
    if (found.length === count) {
      break;
    }

    found.push(DateTime.formatIso(at));
  }

  return found;
};

const none: TakenSlots = new Map();

const takenAt = (...instants: readonly string[]): TakenSlots =>
  new Map(
    instants.map((iso, place) => [
      DateTime.toEpochMillis(utc(iso)),
      PostIdSchema.make(
        `00000000-0000-7000-8000-${String(place + 1).padStart(12, "0")}`
      ),
    ])
  );

describe(slotsAfter, () => {
  it("lists a week's slots in order, whatever order they were given in", () => {
    // 2026-06-15 is a Monday; Paris is on UTC+2 in June.
    expect(
      firstSlots(
        [
          slot("wednesday", "18:00"),
          slot("monday", "09:00"),
          slot("monday", "08:30"),
        ],
        "2026-06-15T05:00:00Z",
        4
      )
    ).toStrictEqual([
      "2026-06-15T06:30:00.000Z",
      "2026-06-15T07:00:00.000Z",
      "2026-06-17T16:00:00.000Z",
      "2026-06-22T06:30:00.000Z",
    ]);
  });

  it("starts strictly after the moment given", () => {
    expect(
      firstSlots([slot("monday", "09:00")], "2026-06-15T07:00:00Z", 1)
    ).toStrictEqual(["2026-06-22T07:00:00.000Z"]);
  });

  it("keeps the wall-clock time across the spring change", () => {
    // 2026-03-29 is the Sunday Paris moves from UTC+1 to UTC+2.
    expect(
      firstSlots([slot("sunday", "09:00")], "2026-03-20T00:00:00Z", 2)
    ).toStrictEqual(["2026-03-22T08:00:00.000Z", "2026-03-29T07:00:00.000Z"]);
  });

  it("moves a skipped time to the jump, and two slots in the gap become one", () => {
    expect(
      firstSlots(
        [
          slot("sunday", "02:15"),
          slot("sunday", "02:45"),
          slot("sunday", "03:30"),
        ],
        "2026-03-28T12:00:00Z",
        3
      )
    ).toStrictEqual([
      // 03:00 CEST, the moment the clocks jump, for both slots in the gap.
      "2026-03-29T01:00:00.000Z",
      "2026-03-29T01:30:00.000Z",
      "2026-04-05T00:15:00.000Z",
    ]);
  });

  it("gives a repeated time once, at its earlier offset, across the fall change", () => {
    // 2026-10-25 is the Sunday Paris moves from UTC+2 back to UTC+1.
    expect(
      firstSlots([slot("sunday", "02:30")], "2026-10-20T00:00:00Z", 3)
    ).toStrictEqual([
      "2026-10-25T00:30:00.000Z",
      "2026-11-01T01:30:00.000Z",
      "2026-11-08T01:30:00.000Z",
    ]);
  });

  it("follows a zone without daylight saving", () => {
    expect(
      firstSlots(
        [slot("sunday", "02:30"), slot("thursday", "23:59")],
        "2026-03-28T00:00:00Z",
        4,
        tokyo
      )
    ).toStrictEqual([
      "2026-03-28T17:30:00.000Z",
      "2026-04-02T14:59:00.000Z",
      "2026-04-04T17:30:00.000Z",
      "2026-04-09T14:59:00.000Z",
    ]);
  });

  it("yields nothing for a queue without slots", () => {
    expect(firstSlots([], "2026-06-15T00:00:00Z", 3)).toStrictEqual([]);
  });

  it("goes on in order for a year, every slot after the one before", () => {
    const slots = [
      slot("monday", "02:30"),
      slot("sunday", "02:30"),
      slot("sunday", "03:00"),
      slot("saturday", "23:59"),
    ];

    const year = firstSlots(slots, "2026-01-01T00:00:00Z", 4 * 53);

    expect(year).toHaveLength(4 * 53);
    expect(new Set(year).size).toBe(year.length);
    expect(year.toSorted()).toStrictEqual(year);
  });
});

describe(nextFreeSlot, () => {
  const slots = [slot("monday", "09:00"), slot("tuesday", "09:00")];

  it("takes the first slot nothing holds", () => {
    expect(
      nextFreeSlot(
        queueOf(slots),
        utc("2026-06-15T05:00:00Z"),
        takenAt("2026-06-15T07:00:00Z")
      ).pipe(Result.map(DateTime.formatIso))
    ).toStrictEqual(Result.succeed("2026-06-16T07:00:00.000Z"));
  });

  it("says a queue without slots has none", () => {
    expect(
      nextFreeSlot(queueOf([]), utc("2026-06-15T05:00:00Z"), none)
    ).toStrictEqual(Result.fail("noSlots"));
  });

  it(`says a queue is full when every slot within ${String(queueHorizonDays)} days is held`, () => {
    const queue = queueOf([slot("monday", "09:00")]);
    const after = utc("2026-06-15T05:00:00Z");
    const all: string[] = [];

    for (const at of slotsAfter(queue, after)) {
      if (
        DateTime.isGreaterThan(
          at,
          DateTime.add(after, { days: queueHorizonDays })
        )
      ) {
        break;
      }

      all.push(DateTime.formatIso(at));
    }

    expect(nextFreeSlot(queue, after, takenAt(...all))).toStrictEqual(
      Result.fail("full")
    );

    // One freed slot is found again.
    expect(
      nextFreeSlot(queue, after, takenAt(...all.slice(1))).pipe(
        Result.map(DateTime.formatIso)
      )
    ).toStrictEqual(Result.succeed(all[0]));
  });
});

describe(previewOf, () => {
  it("lists the coming slots with what holds them, and the first free one", () => {
    const queue = queueOf([slot("monday", "09:00"), slot("tuesday", "09:00")]);

    const taken = takenAt("2026-06-15T07:00:00Z", "2026-06-16T07:00:00Z");

    const preview = previewOf(queue, utc("2026-06-15T05:00:00Z"), 3, taken);

    expect(
      preview.slots.map(({ at, postId }) => [
        DateTime.formatIso(at),
        postId._tag,
      ])
    ).toStrictEqual([
      ["2026-06-15T07:00:00.000Z", "Some"],
      ["2026-06-16T07:00:00.000Z", "Some"],
      ["2026-06-22T07:00:00.000Z", "None"],
    ]);

    expect(preview.nextFree.pipe(Result.map(DateTime.formatIso))).toStrictEqual(
      Result.succeed("2026-06-22T07:00:00.000Z")
    );
  });

  it("finds the first free slot beyond the slots it lists", () => {
    const queue = queueOf([slot("monday", "09:00")]);

    const preview = previewOf(
      queue,
      utc("2026-06-15T05:00:00Z"),
      1,
      takenAt("2026-06-15T07:00:00Z")
    );

    expect(preview.slots).toHaveLength(1);
    expect(preview.nextFree.pipe(Result.map(DateTime.formatIso))).toStrictEqual(
      Result.succeed("2026-06-22T07:00:00.000Z")
    );
  });
});

describe(queueKeyOf, () => {
  it("compares names whatever their case", () => {
    expect(queueKeyOf("Évergreen")).toBe(queueKeyOf("éVERGREEN"));
  });
});
