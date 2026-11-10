import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

import { PlatformSchema, platforms } from "#channels/domain/platform.ts";

describe("the platform list", () => {
  it("lists the eleven platforms a channel can connect to", () => {
    expect(platforms).toStrictEqual([
      "x",
      "linkedin",
      "bluesky",
      "mastodon",
      "threads",
      "instagram",
      "facebook",
      "tiktok",
      "youtube",
      "pinterest",
      "googleBusiness",
    ]);
  });

  it.each(["carrier-pigeon", "X", ""])("refuses %j", (platform) => {
    expect(Schema.is(PlatformSchema)(platform)).toBeFalsy();
  });
});
