import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { QueueIdSchema } from "#publishing/domain/queue-id.ts";
import { reshufflePlan } from "#publishing/domain/queue-reshuffle.ts";
import type { QueuedPost } from "#publishing/domain/queue-reshuffle.ts";
import { createQueue, sameTimetable } from "#publishing/domain/queue.ts";
import type { QueueSlot } from "#publishing/domain/queue.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import type { Weekday } from "#shared/domain/wall-clock.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const workspaceId = WorkspaceIdSchema.make(
  "5b0d3c1e-8f2a-4c6b-9d7e-1a2b3c4d5e6f"
);

const slot = (day: Weekday, hour: number, minute = 0): QueueSlot => ({
  day,
  time: { hour, minute },
});

const queueOf = (slots: readonly QueueSlot[], timeZone = paris) =>
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

const postId = (n: number) =>
  PostIdSchema.make(`00000000-0000-7000-8000-${String(n).padStart(12, "0")}`);

const waiting = (n: number, at: string): QueuedPost => ({
  at: utc(at),
  id: postId(n),
  publishing: false,
});

const publishing = (n: number, at: string): QueuedPost => ({
  at: utc(at),
  id: postId(n),
  publishing: true,
});

// Mondays and Tuesdays at 09:30 in Paris (07:30 UTC in June).
const mondaysAndTuesdays = queueOf([
  slot("monday", 9, 30),
  slot("tuesday", 9, 30),
]);

// A Monday, 09:00 in Paris.
const now = utc("2026-06-15T07:00:00Z");

const planned = (posts: readonly QueuedPost[], queue = mondaysAndTuesdays) =>
  Result.getOrThrow(reshufflePlan(queue, now, posts));

const moves = (posts: readonly QueuedPost[], queue = mondaysAndTuesdays) =>
  planned(posts, queue).moves.map(({ from, postId: id, to }) => ({
    from: DateTime.formatIso(from),
    id,
    to: DateTime.formatIso(to),
  }));

describe("reshuffling a queue", () => {
  it("puts its waiting posts on its slots after now, first to first, in the order of their times", () => {
    expect(
      moves([
        waiting(2, "2026-06-17T10:00:00Z"),
        waiting(1, "2026-06-16T10:00:00Z"),
        waiting(3, "2026-07-01T10:00:00Z"),
      ])
    ).toStrictEqual([
      {
        from: "2026-06-16T10:00:00.000Z",
        id: postId(1),
        to: "2026-06-15T07:30:00.000Z",
      },
      {
        from: "2026-06-17T10:00:00.000Z",
        id: postId(2),
        to: "2026-06-16T07:30:00.000Z",
      },
      {
        from: "2026-07-01T10:00:00.000Z",
        id: postId(3),
        to: "2026-06-22T07:30:00.000Z",
      },
    ]);
  });

  it("gives each of two posts on one instant a slot of its own, the smaller id first", () => {
    const [first, second] = moves([
      waiting(9, "2026-06-15T07:30:00Z"),
      waiting(4, "2026-06-15T07:30:00Z"),
    ]);

    expect(first?.id).toBe(postId(4));
    expect(first?.from).toBe(first?.to);
    expect(second?.id).toBe(postId(9));
    expect(second?.to).toBe("2026-06-16T07:30:00.000Z");
  });

  it("keeps clear of the slots that publishing posts hold, and ignores where waiting posts are now", () => {
    expect(
      moves([
        publishing(1, "2026-06-15T07:30:00Z"),
        waiting(2, "2026-06-16T07:30:00Z"),
        waiting(3, "2026-06-15T08:00:00Z"),
      ]).map(({ id, to }) => [id, to])
    ).toStrictEqual([
      [postId(3), "2026-06-16T07:30:00.000Z"],
      [postId(2), "2026-06-22T07:30:00.000Z"],
    ]);
  });

  it("says how many waiting posts find no slot within the horizon", () => {
    // One slot a week, for more posts than the horizon has Mondays.
    const posts = Array.from({ length: 110 }, (_, place) =>
      waiting(place + 1, "2026-06-15T08:00:00Z")
    );

    const plan = planned(posts, queueOf([slot("monday", 9, 30)]));

    // A year of Mondays from 15 June 2026: 53 within 366 days.
    expect(plan.moves).toHaveLength(53);
    expect(plan.unplaced).toBe(57);
  });

  it("refuses a queue without slots", () => {
    expect(
      Result.isFailure(
        reshufflePlan(queueOf([]), now, [waiting(1, "2026-06-16T10:00:00Z")])
      )
    ).toBeTruthy();
  });

  it("moves nothing for a queue that waits for nothing", () => {
    expect(planned([])).toStrictEqual({ moves: [], unplaced: 0 });
  });
});

describe("a queue's timetable", () => {
  it("is the same whatever the order of its slots, and differs by a slot or a zone", () => {
    const queue = queueOf([slot("monday", 9, 30), slot("tuesday", 9, 30)]);

    expect(
      sameTimetable(
        queue,
        queueOf([slot("tuesday", 9, 30), slot("monday", 9, 30)])
      )
    ).toBeTruthy();
    expect(
      sameTimetable(
        queue,
        queueOf([slot("monday", 9, 30), slot("tuesday", 9, 31)])
      )
    ).toBeFalsy();
    expect(
      sameTimetable(
        queue,
        queueOf(
          [slot("monday", 9, 30), slot("tuesday", 9, 30)],
          TimeZoneIdSchema.make("Asia/Tokyo")
        )
      )
    ).toBeFalsy();
  });
});
