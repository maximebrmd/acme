import { Option } from "effect";

// What visitors and members type is kept as plain text: it is never
// rendered as markup, and holds no control character but line breaks.

const lineFeed = 0x0a;
const tab = 0x09;
const space = 0x20;
const del = 0x7f;
const lastC1 = 0x9f;

// Characters that reorder or hide text: bidirectional overrides and
// isolates, zero-width marks and the byte order mark.
const invisible = new Set([
  0x20_0b, 0x20_0e, 0x20_0f, 0x20_2a, 0x20_2b, 0x20_2c, 0x20_2d, 0x20_2e,
  0x20_60, 0x20_66, 0x20_67, 0x20_68, 0x20_69, 0xfe_ff,
]);

const isControl = (code: number) =>
  code < space || (code >= del && code <= lastC1) || invisible.has(code);

// Code point by code point: a control character is one, and what remains
// keeps its characters whole.
const withoutControls = (text: string, keepLines: boolean): string => {
  let kept = "";

  for (const character of text.replaceAll("\r\n", "\n")) {
    const code = character.codePointAt(0) ?? 0;

    if (code === tab || (code === lineFeed && !keepLines)) {
      kept += " ";
    } else if (code === lineFeed || !isControl(code)) {
      kept += character;
    }
  }

  return kept;
};

/** The longest comment, in characters. */
export const maxCommentLength = 2000;

/** The longest name a visitor gives. */
export const maxVisitorNameLength = 80;

/** The longest selection a comment quotes. */
export const maxQuoteLength = 500;

/**
 * A comment's text as it is kept: without control characters, with its line
 * breaks, at most three blank lines in a row, trimmed. None when nothing is
 * left, or more than `maxCommentLength`.
 */
export const commentText = (typed: string): Option.Option<string> => {
  const text = withoutControls(typed, true)
    .replaceAll(/\n{4,}/gu, "\n\n\n")
    .trim();

  return text === "" || text.length > maxCommentLength
    ? Option.none()
    : Option.some(text);
};

/**
 * A visitor's name as it is kept: one line, without control characters,
 * with single spaces. None when nothing is left, or more than
 * `maxVisitorNameLength`.
 */
export const visitorName = (typed: string): Option.Option<string> => {
  const name = withoutControls(typed, false).replaceAll(/\s+/gu, " ").trim();

  return name === "" || name.length > maxVisitorNameLength
    ? Option.none()
    : Option.some(name);
};

/** A quoted selection as it is kept: without control characters. */
export const quotedText = (selected: string): Option.Option<string> => {
  const quote = withoutControls(selected, true);

  return quote.trim() === "" || quote.length > maxQuoteLength
    ? Option.none()
    : Option.some(quote);
};
