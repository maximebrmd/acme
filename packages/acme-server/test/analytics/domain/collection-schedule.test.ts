import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  collectionEnd,
  nextCollection,
} from "#analytics/domain/collection-schedule.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import {
  endCollection,
  recordReading,
  skipReading,
  trackPublication,
} from "#analytics/domain/tracked-post.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const iso = (at: Option.Option<DateTime.Utc>) =>
  at.pipe(Option.map(DateTime.formatIso));

// A post that went live at 10:20 UTC on 2 November 2026.
const publishedAt = utc("2026-11-02T10:20:00.000Z");

describe(nextCollection, () => {
  it("reads a post every hour for its first 48 hours", () => {
    expect(
      iso(nextCollection(publishedAt, utc("2026-11-02T11:07:00.000Z")))
    ).toStrictEqual(Option.some("2026-11-02T12:07:00.000Z"));

    // 47 hours and 47 minutes old: one more hour.
    expect(
      iso(nextCollection(publishedAt, utc("2026-11-04T10:07:00.000Z")))
    ).toStrictEqual(Option.some("2026-11-04T11:07:00.000Z"));
  });

  it("reads it every day once it is 48 hours old", () => {
    expect(
      iso(nextCollection(publishedAt, utc("2026-11-04T10:20:00.000Z")))
    ).toStrictEqual(Option.some("2026-11-05T10:20:00.000Z"));

    expect(
      iso(nextCollection(publishedAt, utc("2026-11-04T11:07:00.000Z")))
    ).toStrictEqual(Option.some("2026-11-05T11:07:00.000Z"));
  });

  it("reads it a last time when it is 30 days old, then stops", () => {
    expect(DateTime.formatIso(collectionEnd(publishedAt))).toBe(
      "2026-12-02T10:20:00.000Z"
    );

    // The day after would be past 30 days: the last read is at 30 days.
    expect(
      iso(nextCollection(publishedAt, utc("2026-12-01T11:07:00.000Z")))
    ).toStrictEqual(Option.some("2026-12-02T10:20:00.000Z"));

    expect(
      nextCollection(publishedAt, utc("2026-12-02T11:07:00.000Z"))
    ).toStrictEqual(Option.none());

    expect(
      nextCollection(publishedAt, utc("2026-12-02T10:20:00.000Z"))
    ).toStrictEqual(Option.none());
  });

  it("comes due on a run when runs are an hour apart", () => {
    // From the first run after the post went live, every run reads it for
    // 48 hours: each read schedules the next on the run after.
    let at = utc("2026-11-02T11:07:00.000Z");
    let reads = 1;

    for (;;) {
      const next = nextCollection(publishedAt, at);

      if (Option.isNone(next)) {
        break;
      }

      expect(DateTime.getPartUtc(next.value, "minute")).toBeOneOf([7, 20]);

      at = next.value;
      reads += 1;
    }

    // 47 hourly reads, then daily ones until 30 days: about 76 in all.
    expect(reads).toBeGreaterThanOrEqual(74);
    expect(reads).toBeLessThanOrEqual(78);
  });
});

describe("a tracked post", () => {
  const post = trackPublication({
    channelId: ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1"),
    permalink: Option.some("https://mastodon.test/@alice/1"),
    platformPostId: PlatformPostIdSchema.make("110000000000000001"),
    postId: PostIdSchema.make("01900000-0000-7000-8000-0000000000a1"),
    publishedAt,
    targetId: PostTargetIdSchema.make("01900000-0000-7000-8000-0000000000b1"),
    workspaceId: WorkspaceIdSchema.make("3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b"),
  });

  const metrics = new PostMetrics({
    impressions: Option.none(),
    likes: 3,
    quotes: Option.some(1),
    replies: 2,
    reposts: 1,
  });

  it("is first read on the run after it went live", () => {
    expect(post.collection).toStrictEqual({
      _tag: "collecting",
      nextAt: publishedAt,
    });
    expect(post.latest).toStrictEqual(Option.none());
  });

  it("keeps the counts it read, and when", () => {
    const at = utc("2026-11-02T11:07:00.000Z");
    const collectedAt = utc("2026-11-02T11:07:02.500Z");
    const read = recordReading(post, metrics, collectedAt, at);

    expect(read.latest).toStrictEqual(Option.some(metrics));
    expect(read.lastCollectedAt).toStrictEqual(Option.some(collectedAt));
    expect(read.collection).toStrictEqual({
      _tag: "collecting",
      nextAt: utc("2026-11-02T12:07:00.000Z"),
    });
  });

  it("waits for its next turn when it could not be read", () => {
    const at = utc("2026-11-05T11:07:00.000Z");
    const read = recordReading(post, metrics, at, utc("2026-11-04T11:07:00Z"));
    const skipped = skipReading(read, at);

    expect(skipped.latest).toStrictEqual(Option.some(metrics));
    expect(skipped.collection).toStrictEqual({
      _tag: "collecting",
      nextAt: utc("2026-11-06T11:07:00.000Z"),
    });
  });

  it("ends when its window closes, or its channel leaves", () => {
    const last = utc("2026-12-02T11:07:00.000Z");

    expect(recordReading(post, metrics, last, last).collection).toStrictEqual({
      _tag: "ended",
      at: last,
      reason: "window",
    });

    expect(endCollection(post, "disconnected", last).collection).toStrictEqual({
      _tag: "ended",
      at: last,
      reason: "disconnected",
    });
  });
});
