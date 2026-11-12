import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import type { PostSchedule, PostStatus } from "peal-contract";

import { isDue, publishNowOf } from "#posts/publish-now.ts";
import type { PublishNowState } from "#posts/publish-now.ts";

const draft: PublishNowState = {
  canReschedule: false,
  canSchedule: true,
  publishable: true,
  running: false,
  status: "draft",
  willWait: false,
};

const scheduled: PublishNowState = {
  ...draft,
  canReschedule: true,
  canSchedule: false,
  status: "scheduled",
};

describe(publishNowOf, () => {
  it("offers it beside Schedule on a draft", () => {
    expect(publishNowOf(draft)).toStrictEqual({
      _tag: "offered",
      enabled: true,
      from: "draft",
    });
  });

  it("offers it beside Reschedule on a scheduled post", () => {
    expect(publishNowOf(scheduled)).toStrictEqual({
      _tag: "offered",
      enabled: true,
      from: "scheduled",
    });
  });

  it("never offers it where the post would wait for an approval", () => {
    expect(publishNowOf({ ...draft, willWait: true })).toStrictEqual({
      _tag: "none",
    });
    expect(publishNowOf({ ...scheduled, willWait: true })).toStrictEqual({
      _tag: "none",
    });
  });

  it("never offers it on a post that waits, even to one who may schedule", () => {
    expect(
      publishNowOf({ ...scheduled, status: "awaitingApproval" })
    ).toStrictEqual({ _tag: "none" });
  });

  it("is not offered to a member who may not schedule the draft", () => {
    expect(publishNowOf({ ...draft, canSchedule: false })).toStrictEqual({
      _tag: "none",
    });
  });

  it("waits, as Schedule does, until every channel takes the post", () => {
    expect(publishNowOf({ ...draft, publishable: false })).toStrictEqual({
      _tag: "offered",
      enabled: false,
      from: "draft",
    });
    expect(publishNowOf({ ...scheduled, running: true })).toStrictEqual({
      _tag: "offered",
      enabled: false,
      from: "scheduled",
    });
  });
});

const at = (iso: string): PostSchedule => ({
  at: DateTime.makeUnsafe(iso),
  timeZone: "Europe/Paris",
});

const now = DateTime.makeUnsafe("2026-11-12T10:00:00Z");

const due = (status: PostStatus, schedule: PostSchedule | null) =>
  isDue({ schedule, status }, now);

describe(isDue, () => {
  it("holds for a scheduled post whose time has come", () => {
    expect(due("scheduled", at("2026-11-12T10:00:00Z"))).toBeTruthy();
    expect(due("scheduled", at("2026-11-12T09:59:00Z"))).toBeTruthy();
  });

  it("does not hold before its time, or for a post that is not scheduled", () => {
    expect(due("scheduled", at("2026-11-12T10:01:00Z"))).toBeFalsy();
    expect(due("draft", null)).toBeFalsy();
    expect(due("awaitingApproval", at("2026-11-12T09:00:00Z"))).toBeFalsy();
  });
});
