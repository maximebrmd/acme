import { describe, expect, it } from "@effect/vitest";

import { fitOn, fits } from "#posts/character-count.ts";

describe(fitOn, () => {
  it("counts Bluesky in graphemes and bytes, showing the closest limit", () => {
    const fit = fitOn("bluesky", "👨‍👩‍👧".repeat(10), 0);

    expect(fit.counts).toStrictEqual([
      { length: 10, maximum: 300, remaining: 290, unit: "graphemes" },
      { length: 180, maximum: 3000, remaining: 2820, unit: "utf8Bytes" },
    ]);
    expect(fit.tightest?.unit).toBe("graphemes");

    const heavy = fitOn("bluesky", "👨‍👩‍👧".repeat(200), 0);

    expect(heavy.tightest).toStrictEqual({
      length: 3600,
      maximum: 3000,
      remaining: -600,
      unit: "utf8Bytes",
    });
    expect(fits(heavy)).toBeFalsy();
  });

  it("weighs X, a link counting 23", () => {
    const link = `https://example.com/${"path/".repeat(40)}`;
    const fit = fitOn("x", `Read ${link}`, 0);

    expect(fit.tightest).toStrictEqual({
      length: 28,
      maximum: 280,
      remaining: 252,
      unit: "weighted",
    });
    expect(fits(fitOn("x", "日".repeat(141), 0))).toBeFalsy();
    expect(fits(fitOn("x", "日".repeat(140), 0))).toBeTruthy();
  });

  it("asks Instagram for media, and counts its tags", () => {
    const tags = Array.from({ length: 31 }, (_, index) => `#tag${index}`);

    expect(fitOn("instagram", tags.join(" "), 0).problems).toStrictEqual([
      { _tag: "mediaRequired" },
      { _tag: "tooManyHashtags", count: 31, maximum: 30 },
    ]);
    expect(fits(fitOn("instagram", "A caption", 1))).toBeTruthy();
  });

  it("flags an empty post, and too many images", () => {
    expect(fitOn("mastodon", "  ", 0).problems).toStrictEqual([
      { _tag: "empty" },
    ]);
    expect(fitOn("mastodon", "Hi", 5).problems).toStrictEqual([
      { _tag: "tooManyMedia", count: 5, maximum: 4 },
    ]);
  });

  it("has no limit to show for a platform with none known", () => {
    const fit = fitOn("facebook", "a".repeat(10_000), 0);

    expect(fit.tightest).toBeUndefined();
    expect(fits(fit)).toBeTruthy();
  });
});
