import { DateTime, Option } from "effect";
import { describe, expect, it } from "vitest";

import { dashboardOf } from "#analytics/application/analytics-dashboard.ts";
import type { ChannelCounts } from "#analytics/application/analytics-reports.ts";
import { UtcDaySchema } from "#analytics/domain/account-metrics.ts";
import { keptSince } from "#analytics/domain/analytics-retention.ts";
import { ReportRange } from "#analytics/domain/report-range.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

// A dashboard's comparison with the range before, when a platform's terms
// keep its numbers for less than that range goes back.

const now = DateTime.makeUnsafe("2026-11-10T12:00:00Z");

describe(keptSince, () => {
  it("keeps all of a range that starts within the platform's retention", () => {
    const ninetyDaysAgo = DateTime.subtract(now, { days: 89 });

    expect(keptSince("pinterest", ninetyDaysAgo, now)).toBeTruthy();
    expect(
      keptSince("pinterest", DateTime.subtract(now, { days: 91 }), now)
    ).toBeFalsy();
    expect(
      keptSince("linkedin", DateTime.subtract(now, { days: 180 }), now)
    ).toBeTruthy();
    expect(
      keptSince("mastodon", DateTime.subtract(now, { days: 180 }), now)
    ).toBeTruthy();
  });
});

const pinterest = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000a1");
const mastodon = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000a2");

const countsOn = (channelId: ChannelId, likes: number): ChannelCounts => ({
  channelId,
  clicks: Option.none(),
  impressions: Option.none(),
  likes,
  posts: 1,
  quotes: Option.none(),
  reach: Option.none(),
  replies: 0,
  reposts: 0,
  saves: Option.none(),
});

const day = (year: number, month: number, date: number) => ({
  day: date,
  month,
  year,
});

const zone = TimeZoneIdSchema.make("UTC");

const dashboardWith = (kept: (platform: Platform) => boolean) =>
  dashboardOf({
    accountDays: [],
    counts: [countsOn(pinterest, 5), countsOn(mastodon, 3)],
    gains: [],
    platforms: new Map<ChannelId, Platform>([
      [pinterest, "pinterest"],
      [mastodon, "mastodon"],
    ]),
    previous: new ReportRange({
      from: day(2026, 5, 15),
      timeZone: zone,
      to: day(2026, 8, 12),
    }),
    previousCounts: [countsOn(mastodon, 2)],
    previousKeptOn: kept,
    previousSpan: {
      from: UtcDaySchema.make("2026-05-15"),
      to: UtcDaySchema.make("2026-08-12"),
    },
    range: new ReportRange({
      from: day(2026, 8, 13),
      timeZone: zone,
      to: day(2026, 11, 10),
    }),
    rangeDays: [],
    topPosts: [],
  });

describe("a dashboard against the range before", () => {
  it("says the range before is not all kept where a platform no longer has it", () => {
    const found = dashboardWith((platform) => platform !== "pinterest");

    expect(found.previousKept).toBeFalsy();
    expect(
      found.channels.map(({ channelId, previousKept }) => ({
        channelId,
        previousKept,
      }))
    ).toStrictEqual([
      { channelId: pinterest, previousKept: false },
      { channelId: mastodon, previousKept: true },
    ]);
    expect(
      found.platforms.map(({ platform, previousKept }) => ({
        platform,
        previousKept,
      }))
    ).toStrictEqual([
      { platform: "mastodon", previousKept: true },
      { platform: "pinterest", previousKept: false },
    ]);
  });

  it("compares as usual when every platform keeps it", () => {
    expect(dashboardWith(() => true).previousKept).toBeTruthy();
  });
});
