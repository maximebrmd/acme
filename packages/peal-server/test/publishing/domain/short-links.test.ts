import { describe, expect, it } from "@effect/vitest";

import {
  keepsLinksAsWritten,
  linksToShorten,
  shortLengthOf,
  withShortLinks,
} from "#publishing/domain/short-links.ts";

const addresses = { base: "https://go.example.com/", codeLength: 7 };

const long = "https://example.com/a/long/path/to/a/landing/page";

describe("the links a post's text goes out with shortened", () => {
  it("are those written with a scheme and longer than a short address", () => {
    const text = `Read ${long} or example.com/no/scheme/given/here/at/all or https://ex.com/a`;

    expect(linksToShorten(text, "mastodon", addresses)).toStrictEqual([
      { address: long, places: [{ end: 5 + long.length, start: 5 }] },
    ]);
    expect(shortLengthOf(addresses)).toBe(addresses.base.length + 7);
  });

  it("leave out the short links' own host, and addresses naming a user", () => {
    const text = `${addresses.base}AbCdEfG/and/more/after/it https://someone:secret@example.com/a/long/path`;

    expect(linksToShorten(text, "bluesky", addresses)).toStrictEqual([]);
  });

  it("are one per address, with every place it stands", () => {
    const text = `${long} and again ${long}`;

    const [only, ...others] = linksToShorten(text, "linkedin", addresses);

    expect(others).toHaveLength(0);
    expect(only?.places).toStrictEqual([
      { end: long.length, start: 0 },
      { end: text.length, start: text.length - long.length },
    ]);
  });

  it("are none on Pinterest", () => {
    expect(keepsLinksAsWritten("pinterest")).toBeTruthy();
    expect(linksToShorten(long, "pinterest", addresses)).toStrictEqual([]);
  });
});

describe("a text with its links shortened", () => {
  it("keeps what is around them, characters outside the BMP included", () => {
    const text = `🎉🎉 ${long} 👋 ${long}!`;
    const shortUrl = `${addresses.base}AbC1234`;

    const sent = withShortLinks(
      text,
      linksToShorten(text, "x", addresses).map((link) => ({
        ...link,
        shortUrl,
      }))
    );

    expect(sent).toBe(`🎉🎉 ${shortUrl} 👋 ${shortUrl}!`);
  });

  it("is never longer than the text written", () => {
    const text = `See ${long}`;

    const sent = withShortLinks(
      text,
      linksToShorten(text, "x", addresses).map((link) => ({
        ...link,
        shortUrl: `${long}/even/longer`,
      }))
    );

    expect(sent).toBe(text);
  });
});
