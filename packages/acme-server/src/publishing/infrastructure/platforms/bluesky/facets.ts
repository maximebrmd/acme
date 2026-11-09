import { Schema } from "effect";

// Bluesky shows a link or a hashtag only where the post's record marks it,
// as a facet over its UTF-8 bytes (app.bsky.richtext.facet). Mentions need
// the handle resolved to a DID, which is left for later: they stay text.

/** A facet of a post's record, as the lexicon writes it. */
export const FacetSchema = Schema.Struct({
  features: Schema.Array(
    Schema.Union([
      Schema.Struct({
        $type: Schema.Literal("app.bsky.richtext.facet#link"),
        uri: Schema.String,
      }),
      Schema.Struct({
        $type: Schema.Literal("app.bsky.richtext.facet#tag"),
        tag: Schema.String,
      }),
    ])
  ),
  index: Schema.Struct({ byteEnd: Schema.Int, byteStart: Schema.Int }),
});

export type Facet = typeof FacetSchema.Type;

const encoder = new TextEncoder();

// The UTF-8 length of the text before `index` (a UTF-16 offset).
const bytesBefore = (text: string, index: number) =>
  encoder.encode(text.slice(0, index)).length;

const indexOf = (text: string, start: number, end: number) => ({
  byteEnd: bytesBefore(text, end),
  byteStart: bytesBefore(text, start),
});

// A URL ends at whitespace, and does not keep the punctuation after it.
const linkPattern = /\bhttps?:\/\/[^\s<>"]+/gu;

const trailingPunctuation = /[!"'),.:;?\]}]+$/u;

// A tag is `#` after whitespace or at the start, up to the next whitespace,
// and is not only digits.
const tagPattern = /(?<=^|\s)[#＃](?<tag>[^\s#＃]+)/gu;

const trailingTagPunctuation = /\p{P}+$/u;

// The lexicon's limit: 64 graphemes, 640 bytes.
const maxTagLength = 64;

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

const graphemeCount = (text: string) => [...graphemes.segment(text)].length;

const links = (text: string): readonly Facet[] =>
  [...text.matchAll(linkPattern)].flatMap((match) => {
    const uri = match[0].replace(trailingPunctuation, "");
    const start = match.index;

    return URL.canParse(uri)
      ? [
          {
            features: [{ $type: "app.bsky.richtext.facet#link", uri }],
            index: indexOf(text, start, start + uri.length),
          },
        ]
      : [];
  });

const tags = (text: string): readonly Facet[] =>
  [...text.matchAll(tagPattern)].flatMap((match) => {
    const tag = (match.groups?.["tag"] ?? "").replace(
      trailingTagPunctuation,
      ""
    );

    if (tag === "" || /^\d+$/u.test(tag) || graphemeCount(tag) > maxTagLength) {
      return [];
    }

    const start = match.index;

    return [
      {
        features: [{ $type: "app.bsky.richtext.facet#tag", tag }],
        // The facet covers the `#` too.
        index: indexOf(text, start, start + 1 + tag.length),
      },
    ];
  });

/** The links and hashtags of a post's text, in order. */
export const facetsOf = (text: string): readonly Facet[] =>
  [...links(text), ...tags(text)].toSorted(
    (left, right) => left.index.byteStart - right.index.byteStart
  );
