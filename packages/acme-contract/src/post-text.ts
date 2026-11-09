import { Schema } from "effect";

import type { Platform } from "./platform.ts";

// The rules the API applies to a post's text before it schedules it, so
// clients count as the server does: a composer shows how much room is left
// on each platform. The server's rules (src/publishing/domain/text-length.ts
// and platform-rules.ts) are the source; a test keeps the two equal.

/** The most text a post keeps, in UTF-16 code units. */
export const maxPostTextLength = 65_536;

/** The most alt text an attachment keeps. */
export const maxAltTextLength = 5000;

/** The most images and videos a post holds. */
export const maxMediaPerPost = 20;

/**
 * How a platform measures text: graphemes (what a reader sees as one
 * character), Unicode code points, UTF-8 bytes, or X's weighted count, where a
 * link counts as 23, an emoji as 2, and a code point outside Latin, Greek,
 * Cyrillic and common punctuation as 2.
 */
export const TextUnitSchema = Schema.Literals([
  "graphemes",
  "codePoints",
  "utf8Bytes",
  "weighted",
]).annotate({
  description: "How a platform measures the length of a post's text.",
  identifier: "TextUnit",
});

export type TextUnit = typeof TextUnitSchema.Type;

const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

const segmentsOf = (text: string): readonly string[] =>
  Array.from(graphemes.segment(text), ({ segment }) => segment);

const codePointsOf = (text: string): readonly number[] =>
  Array.from(text, (character) => character.codePointAt(0) ?? 0);

const utf8Length = (codePoint: number): number => {
  if (codePoint < 0x80) {
    return 1;
  }

  if (codePoint < 0x8_00) {
    return 2;
  }

  return codePoint < 0x1_00_00 ? 3 : 4;
};

const singleWeightRanges: readonly (readonly [number, number])[] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

const codePointWeight = (codePoint: number): number =>
  singleWeightRanges.some(
    ([first, last]) => codePoint >= first && codePoint <= last
  )
    ? 1
    : 2;

/** What X counts a link as, however long it is. */
export const weightedLinkLength = 23;

const emojiWeight = 2;

const emoji = /^\p{RGI_Emoji}$/v;

const links = /(?<![\p{L}\p{N}@])(?:https?:\/\/|www\.)[^\s<>"]+/giu;

const trailingPunctuation = /[.,;:!?'")\]}]+$/u;

const withoutLinks = (text: string) => {
  let rest = "";
  let count = 0;
  let from = 0;

  for (const match of text.matchAll(links)) {
    const link = match[0].replace(trailingPunctuation, "");

    rest += text.slice(from, match.index);
    count += 1;
    from = match.index + link.length;
  }

  return { links: count, rest: rest + text.slice(from) };
};

const weightedLength = (text: string): number => {
  const { links: linkCount, rest } = withoutLinks(text.normalize("NFC"));

  return segmentsOf(rest).reduce(
    (length, segment) =>
      length +
      (emoji.test(segment)
        ? emojiWeight
        : codePointsOf(segment).reduce(
            (weight, codePoint) => weight + codePointWeight(codePoint),
            0
          )),
    linkCount * weightedLinkLength
  );
};

const measures: Readonly<Record<TextUnit, (text: string) => number>> = {
  codePoints: (text) => codePointsOf(text).length,
  graphemes: (text) => segmentsOf(text).length,
  utf8Bytes: (text) =>
    codePointsOf(text).reduce(
      (bytes, codePoint) => bytes + utf8Length(codePoint),
      0
    ),
  weighted: weightedLength,
};

/** The length of `text` in `unit`. */
export const measureText = (text: string, unit: TextUnit): number =>
  measures[unit](text);

const hashtags = /(?<![\p{L}\p{N}_&#])#[\p{L}\p{N}_]*\p{L}[\p{L}\p{N}_]*/gu;

const mentions = /(?<![\p{L}\p{N}_@])@[\p{L}\p{N}_.]*[\p{L}\p{N}_]/gu;

/** How many hashtags the text holds, such as "#launch". */
export const countHashtags = (text: string): number =>
  [...text.matchAll(hashtags)].length;

/** How many accounts the text mentions, such as "@acme_example". */
export const countMentions = (text: string): number =>
  [...text.matchAll(mentions)].length;

/** At most `maximum` of `unit`. */
export interface TextLimit {
  readonly maximum: number;
  readonly unit: TextUnit;
}

/** What a platform accepts in one post, as far as the API checks. */
export interface PlatformRules {
  readonly maxHashtags?: number;
  readonly maxMedia?: number;
  readonly maxMentions?: number;
  /** The platform publishes images and videos only, never text alone. */
  readonly mediaRequired: boolean;
  /** Every limit applies. */
  readonly textLimits: readonly TextLimit[];
}

export const platformRules: Readonly<Record<Platform, PlatformRules>> = {
  bluesky: {
    maxMedia: 4,
    mediaRequired: false,
    textLimits: [
      { maximum: 300, unit: "graphemes" },
      { maximum: 3000, unit: "utf8Bytes" },
    ],
  },
  facebook: { mediaRequired: false, textLimits: [] },
  instagram: {
    maxHashtags: 30,
    maxMedia: 20,
    maxMentions: 20,
    mediaRequired: true,
    textLimits: [{ maximum: 2200, unit: "codePoints" }],
  },
  linkedin: {
    maxMedia: 20,
    mediaRequired: false,
    textLimits: [{ maximum: 3000, unit: "codePoints" }],
  },
  mastodon: {
    maxMedia: 4,
    mediaRequired: false,
    textLimits: [{ maximum: 500, unit: "codePoints" }],
  },
  pinterest: { mediaRequired: false, textLimits: [] },
  threads: {
    maxMedia: 20,
    mediaRequired: false,
    textLimits: [{ maximum: 500, unit: "codePoints" }],
  },
  tiktok: { mediaRequired: false, textLimits: [] },
  x: {
    maxMedia: 4,
    mediaRequired: false,
    textLimits: [{ maximum: 280, unit: "weighted" }],
  },
  youtube: { mediaRequired: false, textLimits: [] },
};
