// Text that comes from outside Peal's own forms: what a platform answers
// (a comment, a name, a handle, an error's words), and what a visitor
// types on a page without an account. Before any of it is stored it is
// made storable (Postgres takes no NUL, and no lone half of a surrogate
// pair in JSON), bounded, and free of the characters a terminal, a log
// viewer or a page would act on rather than show.

// C0 controls but tab and line feed, DEL, and the C1 controls.
const isControl = (code: number): boolean =>
  code <= 0x08 ||
  (code >= 0x0b && code <= 0x1f) ||
  (code >= 0x7f && code <= 0x9f);

// The marks that reorder, embed or isolate the text around them: in a
// name shown beside other text they can hide or reverse what follows.
const isDirectionMark = (code: number): boolean =>
  code === 0x06_1c ||
  code === 0x20_0e ||
  code === 0x20_0f ||
  (code >= 0x20_2a && code <= 0x20_2e) ||
  (code >= 0x20_66 && code <= 0x20_69);

// The text without the characters `dropped` names, by code point.
const without = (text: string, dropped: (code: number) => boolean): string =>
  Array.from(text, (character) =>
    dropped(character.codePointAt(0) ?? 0) ? "" : character
  ).join("");

// Well formed, with every line break a line feed.
const wellFormed = (text: string): string =>
  text.toWellFormed().replaceAll(/\r\n?/gu, "\n");

// The first `maximum` characters, whole: code points, so no pair is cut.
const bounded = (text: string, maximum: number): string => {
  if (text.length <= maximum) {
    return text;
  }

  let kept = "";
  let count = 0;

  for (const character of text) {
    if (count === maximum) {
      break;
    }

    kept += character;
    count += 1;
  }

  return kept;
};

/**
 * A text as it can be stored and shown: well formed (a lone surrogate
 * becomes U+FFFD), line breaks as line feeds, no NUL and no other control
 * character but tab and line feed, and `maximum` characters at most.
 */
export const storableText = (text: string, maximum: number): string =>
  bounded(without(wellFormed(text), isControl), maximum);

/**
 * A name, a handle or any text shown on one line beside others: as
 * `storableText`, on a single line (white space runs become one space,
 * none at the ends, even where the cut falls on one), without the marks
 * that reorder what is around it.
 */
export const storableLine = (text: string, maximum: number): string =>
  bounded(
    without(
      wellFormed(text),
      (code) => isControl(code) || isDirectionMark(code)
    )
      .replaceAll(/\s+/gu, " ")
      .trim(),
    maximum
  ).trimEnd();
