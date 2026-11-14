import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import type { SocialChannel, PostSchedule, PostStatus } from "peal-contract";

import { isDue, publishNowOf, whereItGoes } from "#posts/publish-now.ts";
import type { PublishNowState } from "#posts/publish-now.ts";

const draft: PublishNowState = {
  canReschedule: false,
  canSchedule: true,
  channels: 2,
  policyKnown: true,
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

  it("waits for the workspace's approval policy, never assuming one", () => {
    expect(publishNowOf({ ...draft, policyKnown: false })).toStrictEqual({
      _tag: "none",
    });
    expect(publishNowOf({ ...scheduled, policyKnown: false })).toStrictEqual({
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

  it("waits for a channel to go to, so it says where the post goes", () => {
    expect(publishNowOf({ ...draft, channels: 0 })).toStrictEqual({
      _tag: "offered",
      enabled: false,
      from: "draft",
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

  it("stops ten minutes after its time, so a tab never asks without end", () => {
    expect(due("scheduled", at("2026-11-12T09:51:00Z"))).toBeTruthy();
    expect(due("scheduled", at("2026-11-12T09:50:00Z"))).toBeFalsy();
  });

  it("does not hold before its time, or for a post that is not scheduled", () => {
    expect(due("scheduled", at("2026-11-12T10:01:00Z"))).toBeFalsy();
    expect(due("draft", null)).toBeFalsy();
    expect(due("awaitingApproval", at("2026-11-12T09:00:00Z"))).toBeFalsy();
  });
});

const channel = (
  handle: string,
  status: SocialChannel["status"]
): SocialChannel => ({
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle,
  id: handle,
  label: null,
  platform: "mastodon",
  status,
  tokenExpiresAt: null,
});

describe(whereItGoes, () => {
  it("names the channels that publish apart from those that cannot", () => {
    expect(
      whereItGoes([
        channel("@on", { _tag: "active" }),
        channel("@off", { _tag: "disabled", refreshNeeded: false }),
        channel("@stale", { _tag: "refreshNeeded" }),
      ])
    ).toStrictEqual({ publishing: ["@on"], skipped: ["@off", "@stale"] });
  });
});
