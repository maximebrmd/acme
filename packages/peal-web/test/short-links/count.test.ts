import { describe, expect, it } from "@effect/vitest";

import { shortenedCount } from "#short-links/count.ts";

const addresses = { base: "https://go.example.com/", codeLength: 7 };

const landing = "https://example.com/a/landing/page/longer/than/a/short/link";

describe("the composer's count of links to shorten", () => {
  it("counts each long link once, across the post's texts", () => {
    expect(
      shortenedCount(
        [`See ${landing}`, `Also ${landing} and https://ex.com/a`],
        ["mastodon", "x"],
        addresses
      )
    ).toStrictEqual({ links: 1, pinterest: false });
  });

  it("counts on a platform that shortens before any channel is chosen", () => {
    expect(shortenedCount([landing], [], addresses).links).toBe(1);
  });

  it("says Pinterest keeps links as written, and counts none there alone", () => {
    expect(shortenedCount([landing], ["pinterest"], addresses)).toStrictEqual({
      links: 0,
      pinterest: true,
    });
    expect(
      shortenedCount([landing], ["pinterest", "bluesky"], addresses)
    ).toStrictEqual({ links: 1, pinterest: true });
  });

  it("leaves out links without a scheme and short ones", () => {
    expect(
      shortenedCount(
        ["example.com/a/long/path/without/any/scheme/at/all https://ex.com/a"],
        ["linkedin"],
        addresses
      ).links
    ).toBe(0);
  });
});
