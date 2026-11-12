// Text Peal did not write often comes as HTML: a Mastodon status's
// content, sanitised by its server (paragraphs, line breaks, links and
// spans), or a feed's item summary, as its site wrote it. Peal keeps plain
// text, so what it says is shown as text and never rendered as markup.

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

// Elements whose content is code, never text: dropped whole, the rest of
// the document too when one never closes.
const hidden = ["script", "style"];

// The HTML without what its hidden elements hold. Where each name next
// opens is searched again only once it is passed, and every search goes
// forward, so the time is linear in the length, whatever the HTML.
const withoutHidden = (html: string): string => {
  const lower = html.toLowerCase();
  const next = new Map(hidden.map((name) => [name, lower.indexOf(`<${name}`)]));
  let kept = "";
  let from = 0;

  for (;;) {
    for (const [name, at] of next) {
      if (at !== -1 && at < from) {
        next.set(name, lower.indexOf(`<${name}`, from));
      }
    }

    let name = "";
    let at = -1;

    for (const [candidate, position] of next) {
      if (position !== -1 && (at === -1 || position < at)) {
        name = candidate;
        at = position;
      }
    }

    if (at === -1) {
      return kept + html.slice(from);
    }

    kept += html.slice(from, at);

    const end = lower.indexOf(`</${name}`, at);
    const close = end === -1 ? -1 : lower.indexOf(">", end);

    if (close === -1) {
      return kept;
    }

    from = close + 1;
  }
};

const lineBreak = /^br\s*\/?$/u;

// The HTML with each tag (from a `<` to the next `>`) dropped, a line
// break for `<br>` and a blank line between a `</p>` and the `<p>` after
// it. Where the next `>` is, is searched again only once passed, so the
// time is linear in the length, whatever the HTML: a `<` that no `>`
// follows starts text, as does everything after it.
const withoutTags = (html: string): string => {
  const lower = html.toLowerCase();
  let kept = "";
  let from = 0;
  let close = lower.indexOf(">");

  while (from < html.length) {
    const open = lower.indexOf("<", from);

    if (open === -1) {
      return kept + html.slice(from);
    }

    kept += html.slice(from, open);

    if (close !== -1 && close < open) {
      close = lower.indexOf(">", open);
    }

    if (close === -1) {
      return kept + html.slice(open);
    }

    const tag = lower.slice(open + 1, close).trim();

    from = close + 1;

    if (lineBreak.test(tag)) {
      kept += "\n";
    } else if (tag === "/p") {
      let next = from;

      while (next < html.length && /\s/u.test(html.charAt(next))) {
        next += 1;
      }

      const paragraph = lower.startsWith("<p", next)
        ? lower.indexOf(">", next)
        : -1;

      if (paragraph !== -1) {
        kept += "\n\n";
        close = paragraph;
        from = paragraph + 1;
      }
    }
  }

  return kept;
};

/**
 * The text of some HTML: what scripts and styles hold dropped, a line
 * break for `<br>`, a blank line between paragraphs, every other tag
 * dropped, entities decoded last, so an escaped `&lt;b&gt;` stays the
 * text `<b>`. Linear in the length of the HTML.
 */
export const textOfHtml = (html: string): string =>
  withoutTags(withoutHidden(html))
    .replaceAll(/&(?<name>#x[0-9a-f]+|#\d+|[a-z]+);/giu, decodeEntity)
    .trim();
