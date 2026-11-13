import { describe, expect, it } from "@effect/vitest";
import type { Platform, PlatformCapabilities } from "peal-contract";

import { platformRowsOf, rowMatches } from "#platforms/rows.ts";

const capabilitiesOn = (
  platform: Platform,
  overrides: {
    readonly perPost?: boolean;
    readonly followUps?: PlatformCapabilities["followUps"];
    readonly unpublish?: boolean;
    readonly limit?: number;
  } = {}
): PlatformCapabilities => ({
  analytics: {
    accountNumbers: [],
    perPost: overrides.perPost ?? true,
    postCounts: [],
  },
  followUps: overrides.followUps ?? null,
  livePost: { edit: false, unpublish: overrides.unpublish ?? true },
  lookups: [],
  media: {
    altText: { maxLength: 1000, shown: true },
    formats: null,
    maxCount: 4,
    maxVideos: null,
    mixesKinds: null,
    required: false,
  },
  options: { constraints: [], fields: [] },
  platform,
  text: {
    forbiddenCharacters: [],
    limits:
      overrides.limit === undefined
        ? []
        : [{ maximum: overrides.limit, unit: "graphemes" }],
    maxHashtags: null,
    maxLinks: null,
    maxMentions: null,
  },
  version: 1,
});

describe(platformRowsOf, () => {
  it("lists each platform in the server's order, with the workspace's channels on it", () => {
    const rows = platformRowsOf(
      [
        capabilitiesOn("x", {
          followUps: { kind: "thread", maxCount: 24 },
          limit: 280,
        }),
        capabilitiesOn("bluesky", { perPost: false, unpublish: false }),
      ],
      [{ platform: "x" }, { platform: "x" }, { platform: "linkedin" }]
    );

    expect(rows).toStrictEqual([
      {
        analytics: true,
        channels: 2,
        followUps: "thread",
        maxMedia: 4,
        platform: "x",
        textLimit: { maximum: 280, unit: "graphemes" },
        unpublish: true,
      },
      {
        analytics: false,
        channels: 0,
        followUps: null,
        maxMedia: 4,
        platform: "bluesky",
        textLimit: null,
        unpublish: false,
      },
    ]);
  });
});

describe(rowMatches, () => {
  const [row] = platformRowsOf([capabilitiesOn("googleBusiness")], []);

  it("matches the name, the id or a capability, whatever the case", () => {
    const words = {
      capabilities: ["Analytics"],
      name: "Google Business Profile",
    };

    expect(row).toBeDefined();

    if (row === undefined) {
      return;
    }

    expect(rowMatches(row, "", words)).toBeTruthy();
    expect(rowMatches(row, "google bus", words)).toBeTruthy();
    expect(rowMatches(row, "BUSINESS", words)).toBeTruthy();
    expect(rowMatches(row, "analyt", words)).toBeTruthy();
  });

  it("leaves out a row that matches nothing", () => {
    const words = { capabilities: [], name: "Google Business Profile" };

    expect(row !== undefined && rowMatches(row, "mastodon", words)).toBeFalsy();
  });
});
