import { Schema } from "effect";

import { isWithoutNul } from "./post-text.ts";

/** The longest name a mention holds, in UTF-16 code units. */
export const maxLinkedInMentionNameLength = 200;

/**
 * A company page a post names. LinkedIn links a mention only when its text
 * is the page's full name, in the same case: `name` is that name, as the
 * lookup answered it, and `urn` the page's (`urn:li:organization:<id>`).
 * Members cannot be named: no API open to Peal finds a member's URN.
 */
export const LinkedInMentionSchema = Schema.Struct({
  name: Schema.String.check(
    Schema.isMaxLength(maxLinkedInMentionNameLength),
    isWithoutNul
  ),
  urn: Schema.String.check(Schema.isMaxLength(64)),
});

export type LinkedInMention = typeof LinkedInMentionSchema.Type;

/** A page's URN. */
export const linkedinOrganizationUrn = /^urn:li:organization:\d+$/u;

/** Whether LinkedIn could link the mention: a named page, on one line. */
export const isLinkableMention = ({ name, urn }: LinkedInMention): boolean =>
  linkedinOrganizationUrn.test(urn) &&
  name.trim() !== "" &&
  name === name.trim() &&
  !/[\n\r]/u.test(name);

/** Where a post's text names a page. */
export interface MentionSpan {
  /** The index after the name's last code unit. */
  readonly end: number;
  readonly mention: LinkedInMention;
  /** The index of the `@`. */
  readonly start: number;
}

const wordCharacter = /[\p{L}\p{N}_]/u;

// A character that could be part of a longer word, as a letter is: the
// character after a name, or before its `@`.
const isWordAt = (text: string, index: number) => {
  const codePoint = text.codePointAt(index);

  return (
    codePoint !== undefined &&
    wordCharacter.test(String.fromCodePoint(codePoint))
  );
};

const isLowSurrogate = (unit: number) => unit >= 0xdc_00 && unit <= 0xdf_ff;

// The character before `index`, whole when it is a surrogate pair.
const isWordBefore = (text: string, index: number) =>
  index > 0 &&
  isWordAt(
    text,
    index > 1 && isLowSurrogate(text.codePointAt(index - 1) ?? 0)
      ? index - 2
      : index - 1
  );

/**
 * Where `text` names the pages of `mentions`: each `@` followed by a page's
 * exact name, when the `@` does not follow a word (an email address) and
 * the name is not the start of a longer word. Where two names fit, the
 * longer wins. The text stays what the member wrote; the spans say which
 * parts LinkedIn links.
 */
export const mentionSpans = (
  text: string,
  mentions: readonly LinkedInMention[]
): readonly MentionSpan[] => {
  const longestFirst = mentions
    .filter(isLinkableMention)
    .toSorted((left, right) => right.name.length - left.name.length);

  const spans: MentionSpan[] = [];
  let from = 0;

  while (from < text.length) {
    const start = text.indexOf("@", from);

    if (start === -1) {
      break;
    }

    const mention = isWordBefore(text, start)
      ? undefined
      : longestFirst.find(
          ({ name }) =>
            text.startsWith(name, start + 1) &&
            !isWordAt(text, start + 1 + name.length)
        );

    if (mention === undefined) {
      from = start + 1;
    } else {
      const end = start + 1 + mention.name.length;

      spans.push({ end, mention, start });
      from = end;
    }
  }

  return spans;
};
