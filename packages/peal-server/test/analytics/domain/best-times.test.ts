import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  bestTimesOf,
  hourStarts,
  minimumPosts,
  weighedCounts,
} from "#analytics/domain/best-times.ts";
import type { WeighedPost } from "#analytics/domain/best-times.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { LocalDateSchema } from "#shared/domain/wall-clock.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const day = (year: number, month: number, date: number) =>
  LocalDateSchema.make({ day: date, month, year });

const at = (iso: string) => DateTime.makeUnsafe(iso);

const post = (iso: string, score: number): WeighedPost => ({
  publishedAt: at(iso),
  score,
});

// A week of Paris hours in winter: Monday 9 to Sunday 15 November 2026.
const week = hourStarts(day(2026, 11, 9), day(2026, 11, 15), paris);

// Enough posts elsewhere for the channel to be ranked.
const filler = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    post(`2026-11-13T${String(index % 10).padStart(2, "0")}:10:00Z`, 1)
  );

describe(hourStarts, () => {
  it("starts each local hour of each day, in order", () => {
    expect(week).toHaveLength(7 * 24);
    expect(week[0]).toStrictEqual({
      at: at("2026-11-08T23:00:00Z"),
      hour: 0,
      weekday: "monday",
    });
    expect(week.at(-1)?.weekday).toBe("sunday");
  });

  it("gives the hour the clocks skip no start, on the last Sunday of March", () => {
    const spring = hourStarts(day(2026, 3, 29), day(2026, 3, 29), paris);

    expect(spring).toHaveLength(23);
    expect(spring.map(({ hour }) => hour)).not.toContain(2);
    expect(spring[2]).toStrictEqual({
      at: at("2026-03-29T01:00:00Z"),
      hour: 3,
      weekday: "sunday",
    });
  });

  it("makes the hour the clocks repeat one, on the last Sunday of October", () => {
    const autumn = hourStarts(day(2026, 10, 25), day(2026, 10, 25), paris);

    expect(autumn).toHaveLength(24);
    // 02:00 the first time, then 03:00 two hours later.
    expect(
      autumn.slice(2, 4).map((start) => DateTime.formatIso(start.at))
    ).toStrictEqual(["2026-10-25T00:00:00.000Z", "2026-10-25T02:00:00.000Z"]);

    const folded = bestTimesOf(autumn, [
      post("2026-10-25T00:30:00Z", 4),
      // 02:30 the second time, an hour later: still the 02:00 hour.
      post("2026-10-25T01:30:00Z", 6),
    ]);

    expect(
      folded.buckets.map(({ hour, posts }) => [hour, posts])
    ).toStrictEqual([[2, 2]]);
  });
});

describe(bestTimesOf, () => {
  it("folds posts into the weekday and hour they went live in, with each hour's median", () => {
    const folded = bestTimesOf(week, [
      ...filler(minimumPosts),
      // Tuesday at 9 in Paris, three posts: 8 is their median.
      post("2026-11-10T08:05:00Z", 2),
      post("2026-11-10T08:15:00Z", 8),
      post("2026-11-10T08:59:59Z", 30),
      // Monday at 9, two posts: under the floor, counted with no figure.
      post("2026-11-09T08:30:00Z", 100),
      post("2026-11-09T08:40:00Z", 100),
    ]);

    const tuesday = folded.buckets.find(
      ({ hour, weekday }) => weekday === "tuesday" && hour === 9
    );

    const monday = folded.buckets.find(
      ({ hour, weekday }) => weekday === "monday" && hour === 9
    );

    expect(folded.enough).toBeTruthy();
    expect(tuesday).toStrictEqual({
      hour: 9,
      median: Option.some(8),
      posts: 3,
      weekday: "tuesday",
    });
    expect(monday?.median).toStrictEqual(Option.none());
    expect(folded.best[0]).toStrictEqual(tuesday);
  });

  it("ranks by median, then by posts, then by weekday and hour, five at most", () => {
    const three = (iso: string, score: number) => [
      post(iso, score),
      post(iso, score),
      post(iso, score),
    ];

    const folded = bestTimesOf(week, [
      ...three("2026-11-11T09:00:00Z", 5),
      ...three("2026-11-10T09:00:00Z", 5),
      ...three("2026-11-12T09:00:00Z", 5),
      post("2026-11-12T09:30:00Z", 5),
      ...three("2026-11-13T09:00:00Z", 7),
      ...three("2026-11-14T09:00:00Z", 1),
      ...three("2026-11-15T09:00:00Z", 2),
      ...three("2026-11-09T09:00:00Z", 3),
    ]);

    expect(folded.best.map(({ weekday }) => weekday)).toStrictEqual([
      "friday",
      "thursday",
      "tuesday",
      "wednesday",
      "monday",
    ]);
  });

  it("ranks nothing under the channel's floor, and still counts each hour's posts", () => {
    const folded = bestTimesOf(week, [
      post("2026-11-10T08:05:00Z", 2),
      post("2026-11-10T08:15:00Z", 8),
      post("2026-11-10T08:59:59Z", 30),
    ]);

    expect(folded).toStrictEqual({
      best: [],
      buckets: [
        { hour: 9, median: Option.none(), posts: 3, weekday: "tuesday" },
      ],
      enough: false,
      posts: 3,
    });
  });

  it("leaves out a post outside the range's hours", () => {
    expect(bestTimesOf(week, [post("2026-11-01T08:00:00Z", 1)]).posts).toBe(0);
  });
});

describe(weighedCounts, () => {
  it("weighs what each platform gives of likes, reposts, replies and quotes", () => {
    expect(weighedCounts("bluesky")).toStrictEqual([
      "likes",
      "reposts",
      "replies",
      "quotes",
    ]);
    expect(weighedCounts("facebook")).toStrictEqual([
      "likes",
      "reposts",
      "replies",
    ]);
    expect(weighedCounts("googleBusiness")).toStrictEqual([]);
  });
});
