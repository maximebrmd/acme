import { describe, expect, it } from "@effect/vitest";

import {
  countHashtags,
  countLinks,
  countMentions,
  measureText,
} from "#publishing/domain/text-length.ts";
import type { TextUnit } from "#publishing/domain/text-length.ts";

// Synthetic texts with what makes platforms count differently: accents
// written as two code points, emoji built of several, scripts X counts twice,
// and links.
const thumbsUpMediumSkin = "👍🏽";

const family = "👨‍👩‍👧";

const combiningAccent = "é";

const lengths = (text: string): Record<TextUnit, number> => ({
  codePoints: measureText(text, "codePoints"),
  emojiBytes: measureText(text, "emojiBytes"),
  graphemes: measureText(text, "graphemes"),
  utf16Units: measureText(text, "utf16Units"),
  utf8Bytes: measureText(text, "utf8Bytes"),
  weighted: measureText(text, "weighted"),
});

describe(measureText, () => {
  it.each([
    {
      expected: {
        codePoints: 5,
        emojiBytes: 5,
        graphemes: 5,
        utf16Units: 5,
        utf8Bytes: 5,
        weighted: 5,
      },
      label: "plain ASCII",
      text: "hello",
    },
    {
      expected: {
        codePoints: 0,
        emojiBytes: 0,
        graphemes: 0,
        utf16Units: 0,
        utf8Bytes: 0,
        weighted: 0,
      },
      label: "nothing",
      text: "",
    },
    {
      expected: {
        codePoints: 2,
        emojiBytes: 8,
        graphemes: 1,
        utf16Units: 4,
        utf8Bytes: 8,
        weighted: 2,
      },
      label: "an emoji with a skin tone",
      text: thumbsUpMediumSkin,
    },
    {
      expected: {
        codePoints: 5,
        emojiBytes: 18,
        graphemes: 1,
        utf16Units: 8,
        utf8Bytes: 18,
        weighted: 2,
      },
      label: "a family emoji joined by zero-width joiners",
      text: family,
    },
    {
      // NFC turns it into one code point, which X counts once.
      expected: {
        codePoints: 2,
        emojiBytes: 2,
        graphemes: 1,
        utf16Units: 2,
        utf8Bytes: 3,
        weighted: 1,
      },
      label: "an accent written as a combining mark",
      text: combiningAccent,
    },
    {
      expected: {
        codePoints: 3,
        emojiBytes: 3,
        graphemes: 3,
        utf16Units: 3,
        utf8Bytes: 9,
        weighted: 6,
      },
      label: "Japanese, which X counts twice",
      text: "日本語",
    },
    {
      expected: {
        codePoints: 3,
        emojiBytes: 3,
        graphemes: 3,
        utf16Units: 3,
        utf8Bytes: 6,
        weighted: 3,
      },
      label: "Cyrillic, which X counts once",
      text: "Мир",
    },
    {
      // An em dash is in a range X counts once; an ellipsis is not.
      expected: {
        codePoints: 2,
        emojiBytes: 2,
        graphemes: 2,
        utf16Units: 2,
        utf8Bytes: 6,
        weighted: 3,
      },
      label: "punctuation",
      text: "—…",
    },
  ])("measures $label", ({ expected, text }) => {
    expect(lengths(text)).toStrictEqual(expected);
  });

  it("counts a link as 23 for X, whatever its length", () => {
    const link = "https://example.com/a/rather/long/path?with=query&and=more";

    expect(measureText(link, "weighted")).toBe(23);
    expect(measureText(link, "codePoints")).toBe(link.length);
  });

  it("counts every link once, and the text around them", () => {
    expect(
      measureText(
        "Read https://example.com/one and www.example.org/two.",
        "weighted"
      )
    ).toBe(5 + 23 + 5 + 23 + 1);
  });

  it("leaves the punctuation that ends a sentence out of a link", () => {
    expect(measureText("(see https://example.com).", "weighted")).toBe(
      5 + 23 + 2
    );
  });

  it("does not take a scheme in the middle of a word for a link", () => {
    expect(measureText("xhttps://example.com", "weighted")).toBe(20);
  });

  it("counts graphemes in long texts as readers see them", () => {
    expect(measureText(family.repeat(300), "graphemes")).toBe(300);
    expect(measureText(family.repeat(300), "utf8Bytes")).toBe(5400);
  });
});

describe(countHashtags, () => {
  it.each([
    { count: 2, text: "#launch day, #été" },
    { count: 0, text: "No tags here" },
    // A tag needs a letter, and a # inside a word starts none.
    { count: 0, text: "#2026 and issue#42" },
  ])("finds $count in $text", ({ count, text }) => {
    expect(countHashtags(text)).toBe(count);
  });
});

describe(countMentions, () => {
  it.each([
    { count: 2, text: "Thanks @acme_example and @other.account!" },
    // An email address mentions nobody.
    { count: 0, text: "Write to team@example.com" },
    { count: 0, text: "@ alone" },
  ])("finds $count in $text", ({ count, text }) => {
    expect(countMentions(text)).toBe(count);
  });
});

describe(countLinks, () => {
  it.each([
    { count: 2, text: "Read https://example.com/one and www.example.org/two." },
    // The same link twice is one, its sentence's full stop left out.
    { count: 1, text: "https://example.com/a, then https://example.com/a." },
    { count: 0, text: "No links, nor team@example.com" },
  ])("finds $count different in $text", ({ count, text }) => {
    expect(countLinks(text)).toBe(count);
  });
});
