import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option } from "effect";

import { defaultWindow } from "#engagement/domain/collection-schedule.ts";
import {
  expireComment,
  forgetComment,
  refreshComment,
} from "#engagement/domain/comment.ts";
import {
  isPastRefresh,
  refreshDeadline,
} from "#engagement/domain/engagement-retention.ts";
import { recordCollection } from "#engagement/domain/thread.ts";
import {
  comment,
  publishedAt,
  reading,
  thread,
} from "#test/engagement/support.ts";

// A platform that bounds how long Peal may keep what it gave without
// reading it again: the bound travels with each read, and a comment not
// read again within it is forgotten.

const after = (duration: Duration.Input) =>
  DateTime.addDuration(publishedAt, duration);

describe("the refresh bound", () => {
  it("is the read's instant plus the platform's bound, or none without one", () => {
    expect(
      refreshDeadline(after("1 hour"), Option.some(Duration.hours(24)))
    ).toStrictEqual(Option.some(after("25 hours")));
    expect(refreshDeadline(after("1 hour"), Option.none())).toStrictEqual(
      Option.none()
    );
  });

  it("has passed at its instant, and not before", () => {
    const by = Option.some(after("1 day"));

    expect(
      isPastRefresh(by, DateTime.subtractDuration(after("1 day"), "1 millis"))
    ).toBeFalsy();
    expect(isPastRefresh(by, after("1 day"))).toBeTruthy();
    expect(isPastRefresh(Option.none(), after("400 days"))).toBeFalsy();
  });

  it("is stamped on the thread by every read, and moved by the next one", () => {
    const first = recordCollection(
      thread(1),
      after("12 minutes"),
      after("10 minutes"),
      defaultWindow,
      Option.some(Duration.days(29)),
      true
    );

    expect(first.refreshBy).toStrictEqual(
      Option.some(after(Duration.sum(Duration.days(29), Duration.minutes(12))))
    );

    const second = recordCollection(
      first,
      after("1 hour"),
      after("1 hour"),
      defaultWindow,
      Option.some(Duration.days(29)),
      true
    );

    expect(second.refreshBy).toStrictEqual(
      Option.some(after(Duration.sum(Duration.days(29), Duration.hours(1))))
    );
  });

  it("is none on a thread whose platform bounds nothing", () => {
    const read = recordCollection(
      thread(1),
      after("12 minutes"),
      after("10 minutes"),
      defaultWindow,
      Option.none(),
      true
    );

    expect(thread(1).refreshBy).toStrictEqual(Option.none());
    expect(read.refreshBy).toStrictEqual(Option.none());
  });
});

describe("a comment forgotten for its age", () => {
  it("keeps nothing its author wrote or is", () => {
    const at = after("30 days");
    const expired = expireComment(comment(1), at);

    expect(expired.state).toBe("deleted");
    expect(expired.text).toBe("");
    expect(expired.author).toStrictEqual(Option.none());
    expect(expired.permalink).toStrictEqual(Option.none());
  });

  it("keeps its id, and when it was forgotten", () => {
    const at = after("30 days");
    const expired = expireComment(comment(1), at);

    expect(expired.platformCommentId).toBe(comment(1).platformCommentId);
    expect(expired.expiredAt).toStrictEqual(Option.some(at));
  });

  it("is not told apart from one deleted on the platform, which has no expiry", () => {
    expect(forgetComment(comment(1)).expiredAt).toStrictEqual(Option.none());
    expect(comment(1).expiredAt).toStrictEqual(Option.none());
  });

  it("is written back by a later read that finds it", () => {
    const back = refreshComment(
      expireComment(comment(1), after("30 days")),
      reading(1)
    );

    expect(back.state).toBe("new");
    expect(back.text).toBe("Comment 1");
    expect(back.expiredAt).toStrictEqual(Option.none());
  });
});
