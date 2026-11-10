import { Option } from "effect";

/** The most of a receiver's answer a delivery keeps. */
export const maxExcerptLength = 256;

// Control characters, the invisible ones that reorder or hide text, and
// the private use and unassigned ranges a terminal or a page may render
// in ways nobody chose.
const unprintable = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}]+/gu;

/**
 * The start of what a receiver answered a failed attempt with, for whoever
 * reads the delivery log to tell what went wrong: one line of printable
 * text, 256 characters at most, none when nothing is left. The rest of the
 * answer is never kept.
 */
export const excerptOf = (body: string): Option.Option<string> => {
  // More than is kept, so cleaning it still leaves enough.
  // Cut first, then made well formed: a cut may leave half a pair.
  const cleaned = body
    .slice(0, maxExcerptLength * 4)
    .toWellFormed()
    .replaceAll(unprintable, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();

  const [...characters] = cleaned;

  return cleaned === ""
    ? Option.none()
    : Option.some(characters.slice(0, maxExcerptLength).join(""));
};
