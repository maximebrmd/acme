// Mastodon gives a status's content as HTML it has already sanitised:
// paragraphs, line breaks, links and spans. Peal keeps plain text, so what
// a comment says is shown as text and never rendered as markup.

const entities = new Map([
  ["amp", "&"],
  ["apos", "'"],
  ["gt", ">"],
  ["lt", "<"],
  ["nbsp", " "],
  ["quot", '"'],
]);

const decodeEntity = (whole: string, name: string): string => {
  if (name.startsWith("#")) {
    const code = name.startsWith("#x")
      ? Number.parseInt(name.slice(2), 16)
      : Math.trunc(Number(name.slice(1)));

    // A character there is: not NUL, not half of a surrogate pair, which
    // a reference may name but no text holds alone.
    return Number.isInteger(code) &&
      code > 0 &&
      code <= 0x10_ff_ff &&
      (code < 0xd8_00 || code > 0xdf_ff)
      ? String.fromCodePoint(code)
      : whole;
  }

  return entities.get(name.toLowerCase()) ?? whole;
};

/**
 * The text of a status's HTML: a line break for `<br>`, a blank line
 * between paragraphs, every other tag dropped, entities decoded last, so
 * an escaped `&lt;b&gt;` stays the text `<b>`.
 */
export const textOfHtml = (html: string): string =>
  html
    .replaceAll(/<br\s*\/?>/giu, "\n")
    .replaceAll(/<\/p>\s*<p[^>]*>/giu, "\n\n")
    .replaceAll(/<[^>]*>/gu, "")
    .replaceAll(/&(?<name>#x[0-9a-f]+|#\d+|[a-z]+);/giu, decodeEntity)
    .trim();
