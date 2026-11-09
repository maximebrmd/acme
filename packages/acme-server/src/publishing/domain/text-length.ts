import { Schema } from "effect";

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
 * - `weighted`: X's open text-counting rules. The text is normalized to NFC;
 *   a link counts as 23, whatever its length; an emoji counts as 2; a code
 *   point counts as 1 in the ranges that hold Latin, Greek, Cyrillic and most
 *   punctuation, and as 2 elsewhere, as in Chinese, Japanese and Korean.
 */
export const TextUnitSchema = Schema.Literals([
  "graphemes",
  "codePoints",
  "utf8Bytes",
  "emojiBytes",
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

// A link starts with a scheme or "www.", after a space or punctuation, and
// runs to the next space. Punctuation that ends a sentence is not part of it.
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

/** How many accounts the text mentions, such as "@acme_example". */
export const countMentions = (text: string): number =>
  [...text.matchAll(mentions)].length;

/**
 * How many different links the text holds, each as X finds them: starting
 * with a scheme or "www.", without the punctuation that ends a sentence.
 * The same link twice counts once.
 */
export const countLinks = (text: string): number =>
  new Set(
    Array.from(text.matchAll(links), ([link]) =>
      link.replace(trailingPunctuation, "")
    )
  ).size;
