// The little of PDF's syntax the page count needs: white space, comments,
// strings, names, and the words between them. Every function reads forward
// from where it is given and answers where it stopped, so a file is read
// once however it is written, and none reads more than `longestToken`
// bytes in one go.

const codeOf = (character: string): number => character.codePointAt(0) ?? 0;

const percent = codeOf("%");
const openParenthesis = codeOf("(");
const closeParenthesis = codeOf(")");
const backslash = codeOf("\\");
const lessThan = codeOf("<");
const greaterThan = codeOf(">");
const openBracket = codeOf("[");
const closeBracket = codeOf("]");
const slash = codeOf("/");
const lineFeed = 10;
const carriageReturn = 13;

const delimiters = new Set(new TextEncoder().encode("()<>[]{}/%"));

// PDF's white space: NUL, tab, line feed, form feed, carriage return, space.
const whiteSpace = new Set([0, 9, lineFeed, 12, carriageReturn, 32]);

/**
 * The longest string, comment, name or word that is read through. A longer
 * one stops the reading (`overlong`): a file's objects have none, and
 * reading one through would hold the process for as long as it is.
 */
export const longestToken = 1024 * 1024;

/** Whether the bytes at `at` are `sequence`. */
export const startsAt = (
  bytes: Uint8Array,
  at: number,
  sequence: readonly number[]
) => sequence.every((byte, index) => bytes[at + index] === byte);

/** Where `sequence` next is, at or after `from`, before `end`; -1 if not. */
export const find = (
  bytes: Uint8Array,
  sequence: readonly number[],
  from: number,
  end = bytes.length
): number => {
  const [first] = sequence;
  const last = end - sequence.length;

  for (let at = from; at <= last; at += 1) {
    if (bytes[at] === first && startsAt(bytes, at, sequence)) {
      return at;
    }
  }

  return -1;
};

/** The bytes of a keyword. */
export const bytesOf = (text: string): readonly number[] => [
  ...new TextEncoder().encode(text),
];

// Where to stop reading one token from `from`, at the latest.
const limitFrom = (bytes: Uint8Array, from: number): number =>
  Math.min(bytes.length, from + longestToken);

const skipWhiteSpace = (bytes: Uint8Array, from: number): number => {
  const limit = limitFrom(bytes, from);
  let at = from;

  while (at < limit && whiteSpace.has(bytes[at] ?? 0)) {
    at += 1;
  }

  return at;
};

// A comment runs to the end of its line.
const skipComment = (bytes: Uint8Array, from: number): number => {
  const limit = limitFrom(bytes, from);
  let at = from;

  while (at < limit && bytes[at] !== lineFeed && bytes[at] !== carriageReturn) {
    at += 1;
  }

  return at;
};

// A literal string: parentheses nest, and a backslash takes the next byte.
// Where it ends, or the limit while it is still open.
const skipString = (bytes: Uint8Array, from: number): number => {
  const limit = limitFrom(bytes, from);
  let at = from + 1;
  let depth = 1;

  while (at < limit && depth > 0) {
    const byte = bytes[at];

    if (byte === backslash) {
      at += 1;
    } else if (byte === openParenthesis) {
      depth += 1;
    } else if (byte === closeParenthesis) {
      depth -= 1;
    }

    at += 1;
  }

  return depth > 0 ? limit : at;
};

// A hexadecimal string, to its `>`.
const skipHex = (bytes: Uint8Array, from: number): number => {
  const limit = limitFrom(bytes, from);
  let at = from + 1;

  while (at < limit && bytes[at] !== greaterThan) {
    at += 1;
  }

  return at < limit ? at + 1 : limit;
};

// A name or a word ends at white space or a delimiter.
const wordEnd = (bytes: Uint8Array, from: number): number => {
  const limit = limitFrom(bytes, from);
  let at = from;

  while (
    at < limit &&
    !whiteSpace.has(bytes[at] ?? 0) &&
    !delimiters.has(bytes[at] ?? 0)
  ) {
    at += 1;
  }

  return at;
};

// The longest name or word that is read as text: none the count needs is
// longer, and a longer one is only skipped, never copied.
const longestText = 24;

const textOf = (bytes: Uint8Array, start: number, end: number): string =>
  end - start > longestText
    ? ""
    : String.fromCodePoint(...bytes.subarray(start, end));

/**
 * What a file holds next: the start or the end of a dictionary or an
 * array, a name (`text` with its slash), a string, or any other word, as a
 * number or a keyword (`text`). `text` is empty for what is too long to be
 * one the count reads. `space` is white space still going on at the limit:
 * reading goes on from its end. `overlong` is anything else still going on
 * there: nothing after it can be told apart, and the reading stops.
 */
export interface PdfToken {
  readonly end: number;
  readonly kind:
    | "arrayClose"
    | "arrayOpen"
    | "close"
    | "end"
    | "name"
    | "open"
    | "overlong"
    | "space"
    | "string"
    | "word";
  readonly start: number;
  readonly text: string;
}

const token = (
  kind: PdfToken["kind"],
  start: number,
  end: number,
  text = ""
): PdfToken => ({ end, kind, start, text });

// A token that ran to the limit without ending is not read further, unless
// the file ends there.
const within = (bytes: Uint8Array, read: PdfToken): PdfToken =>
  read.end - read.start >= longestToken && read.end < bytes.length
    ? token("overlong", read.start, read.end)
    : read;

// What starts with `<` or `>`: a dictionary's ends when doubled, else a
// hexadecimal string, or a stray `>` that is skipped as a word.
const angleToken = (bytes: Uint8Array, at: number): PdfToken => {
  const doubled = bytes[at + 1] === bytes[at];

  if (bytes[at] === lessThan) {
    return doubled
      ? token("open", at, at + 2)
      : token("string", at, skipHex(bytes, at));
  }

  return doubled ? token("close", at, at + 2) : token("word", at, at + 1);
};

const wordToken = (bytes: Uint8Array, at: number): PdfToken => {
  if (bytes[at] === slash) {
    const end = wordEnd(bytes, at + 1);

    return token("name", at, end, textOf(bytes, at, end));
  }

  // A delimiter that starts nothing read here, as a brace, is one byte.
  const end = Math.max(wordEnd(bytes, at), at + 1);

  return token("word", at, end, textOf(bytes, at, end));
};

const tokenAt = (bytes: Uint8Array, at: number): PdfToken => {
  const byte = bytes[at];

  if (byte === percent) {
    // A comment is passed like white space, when it ends within the limit.
    return token("space", at, skipComment(bytes, at));
  }

  if (byte === lessThan || byte === greaterThan) {
    return angleToken(bytes, at);
  }

  if (byte === openParenthesis) {
    return token("string", at, skipString(bytes, at));
  }

  if (byte === openBracket) {
    return token("arrayOpen", at, at + 1);
  }

  return byte === closeBracket
    ? token("arrayClose", at, at + 1)
    : wordToken(bytes, at);
};

/**
 * The token at or after `from`, past white space. White space and comments
 * come back as `space`, for the caller to read on from their end.
 */
export const nextToken = (bytes: Uint8Array, from: number): PdfToken => {
  const at = skipWhiteSpace(bytes, from);

  if (at >= bytes.length) {
    return token("end", at, at);
  }

  return whiteSpace.has(bytes[at] ?? 0)
    ? token("space", from, at)
    : within(bytes, tokenAt(bytes, at));
};

/** Where a stream's bytes start, after the `stream` keyword's line end. */
export const afterLineEnd = (bytes: Uint8Array, from: number): number => {
  const at = bytes[from] === carriageReturn ? from + 1 : from;

  return bytes[at] === lineFeed ? at + 1 : at;
};
