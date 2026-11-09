import { Schema } from "effect";

import { xLinksIn } from "./x-links.ts";

/**
 * How a platform measures the length of a post's text:
 *
 * - `graphemes`: what a reader sees as one character, such as "👍🏽" or an
 *   "é" written as "e" and a combining accent (Bluesky).
 * - `codePoints`: Unicode code points, so an emoji built of several, such as
 *   a family, counts each of them (Instagram, and the platforms that only
 *   say "characters").
 * - `utf8Bytes`: the bytes of the text encoded as UTF-8 (Bluesky's second
 *   limit).
 * - `emojiBytes`: code points, but an emoji counts the bytes it takes in
 *   UTF-8, 4 for most and more for those built of several (Threads, whose
 *   "Posts" page says "Emojis are counted as the number of UTF-8 bytes").
 * - `utf16Units`: UTF-16 code units, as JavaScript counts a string's
 *   length, so most emoji count 2 (TikTok's "UTF-16 runes").
 * - `weighted`: X's open text-counting rules (twitter-text's `parseTweet`).
 *   The text is normalized to NFC; a link counts as 23, whatever its length,
 *   with or without a scheme (`peal.social` too, see `./x-links.ts`); an
 *   emoji counts as 2, sequences of several code points included; a code
 *   point counts as 1 in the ranges that hold Latin, Greek, Cyrillic and most
 *   punctuation, and as 2 elsewhere, as in Chinese, Japanese and Korean.
 */
export const TextUnitSchema = Schema.Literals([
  "graphemes",
  "codePoints",
  "utf8Bytes",
  "emojiBytes",
  "utf16Units",
  "weighted",
]);

export type TextUnit = typeof TextUnitSchema.Type;

// Grapheme boundaries do not depend on the language.
const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

const segmentsOf = (text: string): readonly string[] =>
  Array.from(graphemes.segment(text), ({ segment }) => segment);

const codePointsOf = (text: string): readonly number[] =>
  Array.from(text, (character) => character.codePointAt(0) ?? 0);

// A lone surrogate is encoded as U+FFFD, three bytes, like any other code
// point below U+10000 above U+07FF.
const utf8Length = (codePoint: number): number => {
  if (codePoint < 0x80) {
    return 1;
  }

  if (codePoint < 0x8_00) {
    return 2;
  }

  return codePoint < 0x1_00_00 ? 3 : 4;
};

// The code points X counts once; every other counts twice.
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

// The emoji X counts as 2 each, whatever they are built of, found as
// twitter-text finds them: the longest at each place, a keycap without its
// variation selector too ("1⃣"). The list is Unicode's current one
// (`RGI_Emoji`), on purpose: twitter-text 3.1.0 carries a 2019 list, which
// lacks some ZWJ sequences and counts them by code point (🧑🏽‍💻 and 👁️‍🗨️ as
// 5, where Peal counts 2), and X's own composer counts by a newer one. A
// post near 280 made of such sequences is the only text the two can tell
// apart; X's answer then wins, as for any refusal.
const emojis = /\p{RGI_Emoji}|[#*0-9]\u20E3/gv;

const codePointsWeight = (text: string): number =>
  codePointsOf(text).reduce(
    (weight, codePoint) => weight + codePointWeight(codePoint),
    0
  );

const weightOf = (text: string): number => {
  let length = 0;
  let from = 0;

  for (const match of text.matchAll(emojis)) {
    length += codePointsWeight(text.slice(from, match.index)) + emojiWeight;
    from = match.index + match[0].length;
  }

  return length + codePointsWeight(text.slice(from));
};

const weightedLength = (text: string): number => {
  const normalized = text.normalize("NFC");
  let length = 0;
  let from = 0;

  for (const link of xLinksIn(normalized)) {
    length += weightOf(normalized.slice(from, link.start)) + weightedLinkLength;
    from = link.end;
  }

  return length + weightOf(normalized.slice(from));
};

const utf8BytesOf = (text: string): number =>
  codePointsOf(text).reduce(
    (bytes, codePoint) => bytes + utf8Length(codePoint),
    0
  );

// Each emoji, as a reader sees one, by its bytes; anything else by its code
// points.
const emojiBytesLength = (text: string): number =>
  segmentsOf(text).reduce(
    (length, segment) =>
      length +
      (emoji.test(segment)
        ? utf8BytesOf(segment)
        : codePointsOf(segment).length),
    0
  );

const measures: Readonly<Record<TextUnit, (text: string) => number>> = {
  codePoints: (text) => codePointsOf(text).length,
  emojiBytes: emojiBytesLength,
  graphemes: (text) => segmentsOf(text).length,
  utf16Units: (text) => text.length,
  utf8Bytes: utf8BytesOf,
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

/** How many accounts the text mentions, such as "@peal_example". */
export const countMentions = (text: string): number =>
  [...text.matchAll(mentions)].length;

/**
 * How many different links the text holds, each as X finds them (see
 * `./x-links.ts`): with or without a scheme, on a known top-level domain,
 * without the punctuation that ends a sentence. The same link twice counts
 * once.
 */
export const countLinks = (text: string): number =>
  new Set(xLinksIn(text).map(({ url }) => url)).size;
