/** How many characters of a post's text a list across workspaces shows. */
export const excerptLength = 140;

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/**
 * The start of a post's text, at most `length` characters as a reader
 * counts them (an emoji made of several code points is one), so a cut
 * never splits one. Line breaks become spaces: it is shown on one line.
 */
export const excerptOf = (text: string, length = excerptLength): string => {
  const kept: string[] = [];

  for (const { segment } of graphemes.segment(text)) {
    if (kept.length === length) {
      break;
    }

    kept.push(segment);
  }

  return kept.join("").replaceAll(/\s+/gu, " ").trim();
};
