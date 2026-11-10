import { mentionSpans } from "#publishing/domain/linkedin-mentions.ts";
import type { LinkedInMention } from "#publishing/domain/linkedin-mentions.ts";

// LinkedIn reads a post's commentary in its "little" text format, where
// these characters are markup: each is written with a backslash before it,
// or LinkedIn takes it for a template and may drop what follows.
const reserved = /[|{}@[\]()<>#\\*_~]/gu;

// A hashtag: "#" after a space, punctuation or the start, then letters,
// digits and underscores, with a letter among them, as the composer counts
// them.
const hashtags =
  /(?<![\p{L}\p{N}_&#])#(?<tag>[\p{L}\p{N}_]*\p{L}[\p{L}\p{N}_]*)/gu;

const escaped = (text: string): string =>
  text.replaceAll(reserved, (character) => `\\${character}`);

// Text between mentions: every reserved character escaped, and each
// hashtag written as LinkedIn's hashtag template, so it shows as one.
const plain = (text: string): string => {
  let written = "";
  let from = 0;

  for (const match of text.matchAll(hashtags)) {
    const tag = match.groups?.["tag"] ?? "";

    written += escaped(text.slice(from, match.index));
    written += `{hashtag|\\#|${escaped(tag)}}`;
    from = match.index + match[0].length;
  }

  return written + escaped(text.slice(from));
};

/**
 * A post's text as LinkedIn's commentary: every reserved character escaped,
 * each hashtag written as LinkedIn's hashtag template, and each page the
 * text names (`@` and the page's name, for the pages in `mentions`) written
 * as a mention, `@[name](urn)`, its name escaped like any text. LinkedIn
 * links a mention whose text is the page's full name, in the same case,
 * and shows any other as plain text. An `@` that names no page of
 * `mentions` stays plain text.
 */
export const littleTextOf = (
  text: string,
  mentions: readonly LinkedInMention[] = []
): string => {
  let written = "";
  let from = 0;

  for (const { end, mention, start } of mentionSpans(text, mentions)) {
    written += plain(text.slice(from, start));
    written += `@[${escaped(mention.name)}](${mention.urn})`;
    from = end;
  }

  return written + plain(text.slice(from));
};
