import { Match } from "effect";

import type { MediaAssetId } from "#shared/domain/ids.ts";

import type {
  ArticleBody,
  Block,
  Inline,
  ListItem,
  Mark,
} from "./article-body.ts";

// The one place an article's HTML is written: from the body's document,
// node by node, each of the allow-list's nodes and marks as the element it
// stands for, every text and attribute escaped. Nothing of the document
// is passed through as markup.

const escapes = new Map([
  ['"', "&quot;"],
  ["&", "&amp;"],
  ["'", "&#39;"],
  ["<", "&lt;"],
  [">", "&gt;"],
]);

/** Text, or an attribute's value in double quotes, as HTML holds it. */
export const escapeHtml = (text: string): string =>
  text.replaceAll(
    /["&'<>]/gu,
    (character) => escapes.get(character) ?? character
  );

// Marks nest in this order, the link outermost, whatever order the
// editor kept them in.
const markOrder: readonly Mark["type"][] = [
  "link",
  "bold",
  "italic",
  "strike",
  "code",
];

const wrapped: (mark: Mark) => (html: string) => string =
  Match.type<Mark>().pipe(
    Match.discriminatorsExhaustive("type")({
      bold: () => (html: string) => `<strong>${html}</strong>`,
      code: () => (html: string) => `<code>${html}</code>`,
      italic: () => (html: string) => `<em>${html}</em>`,
      link:
        ({ attrs }) =>
        (html: string) =>
          `<a href="${escapeHtml(attrs.href)}">${html}</a>`,
      strike: () => (html: string) => `<s>${html}</s>`,
    })
  );

const inlineHtml = (node: Inline): string => {
  if (node.type === "hardBreak") {
    return "<br>";
  }

  // The innermost mark first: the link wraps the rest.
  const marks = (node.marks ?? []).toSorted(
    (left, right) =>
      markOrder.indexOf(right.type) - markOrder.indexOf(left.type)
  );

  let html = escapeHtml(node.text);

  for (const mark of marks) {
    html = wrapped(mark)(html);
  }

  return html;
};

const inlinesHtml = (content: readonly Inline[] | undefined) =>
  (content ?? []).map(inlineHtml).join("");

/** Where the site keeps each file the body shows, by the library's id. */
export type ImageAddresses = ReadonlyMap<MediaAssetId, string>;

const blockHtml = (block: Block, images: ImageAddresses): string => {
  const children = (blocks: readonly Block[]) =>
    blocks.map((child) => blockHtml(child, images)).join("");

  const items = (list: readonly ListItem[]) =>
    list.map((item) => `<li>${children(item.content)}</li>`).join("");

  return Match.value(block).pipe(
    Match.discriminatorsExhaustive("type")({
      blockquote: ({ content }) =>
        `<blockquote>${children(content)}</blockquote>`,
      bulletList: ({ content }) => `<ul>${items(content)}</ul>`,
      codeBlock: ({ content }) =>
        `<pre><code>${(content ?? [])
          .map(({ text }) => escapeHtml(text))
          .join("")}</code></pre>`,
      heading: ({ attrs, content }) =>
        `<h${attrs.level}>${inlinesHtml(content)}</h${attrs.level}>`,
      horizontalRule: () => "<hr>",
      // A file the site was not given is left out rather than shown
      // broken.
      image: ({ attrs }) => {
        const source = images.get(attrs.mediaId);

        return source === undefined
          ? ""
          : `<figure><img src="${escapeHtml(source)}" alt="${escapeHtml(attrs.alt)}"></figure>`;
      },
      orderedList: ({ attrs, content }) => {
        const start = attrs?.start ?? 1;

        return start === 1
          ? `<ol>${items(content)}</ol>`
          : `<ol start="${start}">${items(content)}</ol>`;
      },
      paragraph: ({ content }) => `<p>${inlinesHtml(content)}</p>`,
    })
  );
};

/**
 * The body as HTML, its blocks one to a line, its images at the addresses
 * the site gave them.
 */
export const articleHtml = (
  body: ArticleBody,
  images: ImageAddresses
): string =>
  body.content
    .map((block) => blockHtml(block, images))
    .filter((html) => html !== "")
    .join("\n");
