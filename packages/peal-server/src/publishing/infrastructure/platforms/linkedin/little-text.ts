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

/**
 * A post's text as LinkedIn's commentary: every reserved character escaped,
 * and each hashtag written as LinkedIn's hashtag template, so it shows as a
 * hashtag. Mentions stay plain text: naming a member needs their URN.
 */
export const littleTextOf = (text: string): string => {
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
