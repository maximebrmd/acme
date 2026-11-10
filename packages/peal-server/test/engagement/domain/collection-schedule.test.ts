import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option } from "effect";

import {
  defaultWindow,
  nextCollection,
} from "#engagement/domain/collection-schedule.ts";
import {
  endCollection,
  postponeCollection,
  recordCollection,
} from "#engagement/domain/thread.ts";
import { publishedAt, thread } from "#test/engagement/support.ts";

const after = (duration: Duration.Input) =>
  DateTime.addDuration(publishedAt, duration);

const waitAt = (age: Duration.Input) =>
  nextCollection(publishedAt, after(age), defaultWindow).pipe(
    Option.map((at) => DateTime.distance(after(age), at)),
    Option.map(Duration.toMinutes)
  );

describe("the comments collection schedule", () => {
  it("reads a post on every run in its first day", () => {
    expect(waitAt("0 minutes")).toStrictEqual(Option.some(10));
    expect(waitAt("23 hours")).toStrictEqual(Option.some(10));
  });

  it("reads it every hour in its first week", () => {
    expect(waitAt("24 hours")).toStrictEqual(Option.some(60));
    expect(waitAt("6 days")).toStrictEqual(Option.some(60));
  });

  it("reads it every six hours until it leaves the window", () => {
    expect(waitAt("7 days")).toStrictEqual(Option.some(360));
    expect(waitAt("20 days")).toStrictEqual(Option.some(360));
  });

  it("reads it a last time when it leaves the window, and never after", () => {
    expect(waitAt("719 hours")).toStrictEqual(Option.some(60));
    expect(waitAt("30 days")).toStrictEqual(Option.none());
    expect(waitAt("45 days")).toStrictEqual(Option.none());
  });

  it("follows the window the operator set", () => {
    expect(
      nextCollection(publishedAt, after("30 days"), Duration.days(60))
    ).toStrictEqual(Option.some(after("726 hours")));
  });
});

describe("a thread's collection", () => {
  it("is read first as soon as its post went live", () => {
    expect(thread(1).collection).toStrictEqual({
      _tag: "collecting",
      nextAt: publishedAt,
    });
  });

  it("schedules the next read from the run that read it", () => {
    const read = recordCollection(
      thread(1),
      after("12 minutes"),
      after("10 minutes"),
      defaultWindow
    );

    expect(read.collection).toStrictEqual({
      _tag: "collecting",
      nextAt: after("20 minutes"),
    });
    expect(read.lastCollectedAt).toStrictEqual(
      Option.some(after("12 minutes"))
    );
  });

  it("ends with the window", () => {
    const read = recordCollection(
      thread(1),
      after("30 days"),
      after("30 days"),
      defaultWindow
    );

    expect(read.collection).toStrictEqual({
      _tag: "ended",
      at: after("30 days"),
      reason: "window",
    });
  });

  it("waits half an hour when its platform could not be read", () => {
    const postponed = postponeCollection(
      thread(1),
      after("10 minutes"),
      defaultWindow
    );

    expect(postponed.collection).toStrictEqual({
      _tag: "collecting",
      nextAt: after("40 minutes"),
    });
    expect(postponed.lastCollectedAt).toStrictEqual(Option.none());
  });

  it("waits for its own turn when that comes later than the retry", () => {
    const postponed = postponeCollection(
      thread(1),
      after("10 days"),
      defaultWindow
    );

    expect(postponed.collection).toStrictEqual({
      _tag: "collecting",
      nextAt: after("246 hours"),
    });
  });

  it("ends for good when its channel left", () => {
    expect(
      endCollection(thread(1), "disconnected", after("1 hour")).collection
    ).toStrictEqual({
      _tag: "ended",
      at: after("1 hour"),
      reason: "disconnected",
    });
  });
});
