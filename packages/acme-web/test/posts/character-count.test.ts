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

  it("counts a Threads emoji by its UTF-8 bytes, as Threads does", () => {
    expect(
      fitOn("threads", `${"a".repeat(480)}${"😀".repeat(5)}`, 0).tightest
    ).toStrictEqual({
      length: 500,
      maximum: 500,
      remaining: 0,
      unit: "emojiBytes",
    });
    expect(
      fits(fitOn("threads", `${"a".repeat(481)}${"😀".repeat(5)}`, 0))
    ).toBeFalsy();
  });

  it("takes 5 different links on Threads", () => {
    const links = Array.from(
      { length: 6 },
      (_, index) => `https://example.com/${index}`
    );

    expect(fits(fitOn("threads", links.slice(0, 5).join(" "), 0))).toBeTruthy();
    expect(fitOn("threads", links.join(" "), 0).problems).toStrictEqual([
      { _tag: "tooManyLinks", count: 6, maximum: 5 },
    ]);
  });

  it("asks Instagram for media, and counts its tags", () => {
    const tags = Array.from({ length: 31 }, (_, index) => `#tag${index}`);

    expect(fitOn("instagram", tags.join(" "), 0).problems).toStrictEqual([
      { _tag: "mediaRequired" },
      { _tag: "tooManyHashtags", count: 31, maximum: 30 },
    ]);
    expect(fits(fitOn("instagram", "A caption", 1))).toBeTruthy();
  });

  it("counts a YouTube description in bytes, and refuses < and >", () => {
    expect(fitOn("youtube", "é".repeat(2500), 1).tightest).toStrictEqual({
      length: 5000,
      maximum: 5000,
      remaining: 0,
      unit: "utf8Bytes",
    });
    expect(fitOn("youtube", "1 < 2", 1).problems).toStrictEqual([
      { _tag: "forbiddenCharacters", characters: ["<"] },
    ]);
    expect(fitOn("youtube", "A description", 0).problems).toStrictEqual([
      { _tag: "mediaRequired" },
    ]);
    expect(fits(fitOn("youtube", "A description", 1))).toBeTruthy();
  });

  it("flags an empty post, and too many images", () => {
    expect(fitOn("mastodon", "  ", 0).problems).toStrictEqual([
      { _tag: "empty" },
    ]);
    expect(fitOn("mastodon", "Hi", 5).problems).toStrictEqual([
      { _tag: "tooManyMedia", count: 5, maximum: 4 },
    ]);
  });

  it("counts TikTok's caption in UTF-16 code units, and asks for media", () => {
    const fit = fitOn("tiktok", "👍".repeat(1100), 0);

    expect(fit.tightest).toStrictEqual({
      length: 2200,
      maximum: 2200,
      remaining: 0,
      unit: "utf16Units",
    });
    expect(fit.problems).toStrictEqual([{ _tag: "mediaRequired" }]);
  });

  it("has no limit to show for a platform with none known", () => {
    const fit = fitOn("pinterest", "a".repeat(10_000), 0);

    expect(fit.tightest).toBeUndefined();
    expect(fits(fit)).toBeTruthy();
  });
});
