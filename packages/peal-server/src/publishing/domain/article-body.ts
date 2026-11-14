import { Match, Schema } from "effect";

import { MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";

// An article's body is a document of the composer's rich-text editor, in
// the editor's own JSON (a ProseMirror document: nodes with a `type`,
// their `content` and `attrs`, text with its `marks`), kept to the nodes
// and marks of the allow-list below. Anything else does not decode, so
// nothing a member pastes reaches a website but what the list holds; what
// is sent is written from the document by `article-html.ts`.

/** The longest address a link takes. */
export const maxLinkLength = 2048;

/** The most text a body holds, in characters, all nodes together. */
export const maxBodyText = 200_000;

/** The most nodes a body holds, and how deep they nest. */
export const maxBodyNodes = 20_000;

export const maxBodyDepth = 8;

/** The longest description of an image. */
export const maxAltTextLength = 1000;

// Schemes a link may lead to: a page, or an address to write to. Never a
// script (`javascript:`) or a document of its own (`data:`).
const linkSchemes: ReadonlySet<string> = new Set([
  "http:",
  "https:",
  "mailto:",
]);

const isLinkAddress = (href: string) => {
  const url = URL.parse(href);

  return url !== null && linkSchemes.has(url.protocol);
};

// Text Postgres and JSON store as written: no NUL, no half of a
// surrogate pair.
const isStorable = (text: string) =>
  !text.includes("\u0000") && text.isWellFormed();

const TextSchema = Schema.String.check(
  Schema.makeFilter(isStorable, {
    expected: "text without NUL or lone surrogates",
  })
);

const LinkSchema = Schema.Struct({
  attrs: Schema.Struct({
    href: Schema.String.check(
      Schema.isMaxLength(maxLinkLength),
      Schema.makeFilter(isLinkAddress, {
        expected: "an http, https or mailto address",
      })
    ),
  }),
  type: Schema.Literal("link"),
});

/** How text is set: bold, italic, struck, code, or a link. */
export const MarkSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("bold") }),
  Schema.Struct({ type: Schema.Literal("italic") }),
  Schema.Struct({ type: Schema.Literal("strike") }),
  Schema.Struct({ type: Schema.Literal("code") }),
  LinkSchema,
]);

export type Mark = typeof MarkSchema.Type;

const TextNodeSchema = Schema.Struct({
  marks: Schema.optionalKey(Schema.Array(MarkSchema)),
  text: TextSchema,
  type: Schema.Literal("text"),
});

export type TextNode = typeof TextNodeSchema.Type;

const HardBreakSchema = Schema.Struct({ type: Schema.Literal("hardBreak") });

const InlineSchema = Schema.Union([TextNodeSchema, HardBreakSchema]);

export type Inline = typeof InlineSchema.Type;

const ParagraphSchema = Schema.Struct({
  content: Schema.optionalKey(Schema.Array(InlineSchema)),
  type: Schema.Literal("paragraph"),
});

// Level 1 is the article's title, which the site writes itself.
const HeadingSchema = Schema.Struct({
  attrs: Schema.Struct({ level: Schema.Literals([2, 3, 4]) }),
  content: Schema.optionalKey(Schema.Array(InlineSchema)),
  type: Schema.Literal("heading"),
});

const HorizontalRuleSchema = Schema.Struct({
  type: Schema.Literal("horizontalRule"),
});

/** A file of the workspace's library, shown in the body. */
const ImageSchema = Schema.Struct({
  attrs: Schema.Struct({
    alt: TextSchema.check(Schema.isMaxLength(maxAltTextLength)),
    mediaId: MediaAssetIdSchema,
  }),
  type: Schema.Literal("image"),
});

const CodeBlockSchema = Schema.Struct({
  content: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({ text: TextSchema, type: Schema.Literal("text") })
    )
  ),
  type: Schema.Literal("codeBlock"),
});

export type Paragraph = typeof ParagraphSchema.Type;

export type Heading = typeof HeadingSchema.Type;

export type HorizontalRule = typeof HorizontalRuleSchema.Type;

export type Image = typeof ImageSchema.Type;

export type CodeBlock = typeof CodeBlockSchema.Type;

// The containers, over the image as decoded or as stored: the only node
// whose stored form differs (its file's id is branded once decoded).
interface ListItemOf<I> {
  readonly content: readonly BlockOf<I>[];
  readonly type: "listItem";
}

interface BulletListOf<I> {
  readonly content: readonly ListItemOf<I>[];
  readonly type: "bulletList";
}

interface OrderedListOf<I> {
  readonly attrs?: { readonly start?: number };
  readonly content: readonly ListItemOf<I>[];
  readonly type: "orderedList";
}

interface BlockquoteOf<I> {
  readonly content: readonly BlockOf<I>[];
  readonly type: "blockquote";
}

type BlockOf<I> =
  | BlockquoteOf<I>
  | BulletListOf<I>
  | CodeBlock
  | Heading
  | HorizontalRule
  | I
  | OrderedListOf<I>
  | Paragraph;

export type ListItem = ListItemOf<Image>;

export type BulletList = BulletListOf<Image>;

export type OrderedList = OrderedListOf<Image>;

export type Blockquote = BlockquoteOf<Image>;

/** A part of the body that stands on its own lines. */
export type Block = BlockOf<Image>;

type StoredImage = typeof ImageSchema.Encoded;

const BlockSchema: Schema.Codec<Block, BlockOf<StoredImage>> = Schema.suspend(
  () =>
    Schema.Union([
      ParagraphSchema,
      HeadingSchema,
      BulletListSchema,
      OrderedListSchema,
      BlockquoteSchema,
      HorizontalRuleSchema,
      ImageSchema,
      CodeBlockSchema,
    ])
);

const ListItemSchema: Schema.Codec<
  ListItem,
  ListItemOf<StoredImage>
> = Schema.Struct({
  content: Schema.Array(BlockSchema),
  type: Schema.Literal("listItem"),
});

const BulletListSchema: Schema.Codec<
  BulletList,
  BulletListOf<StoredImage>
> = Schema.Struct({
  content: Schema.Array(ListItemSchema),
  type: Schema.Literal("bulletList"),
});

const OrderedListSchema: Schema.Codec<
  OrderedList,
  OrderedListOf<StoredImage>
> = Schema.Struct({
  attrs: Schema.optionalKey(
    Schema.Struct({
      start: Schema.optionalKey(
        Schema.Int.check(Schema.isBetween({ maximum: 1_000_000, minimum: 0 }))
      ),
    })
  ),
  content: Schema.Array(ListItemSchema),
  type: Schema.Literal("orderedList"),
});

const BlockquoteSchema: Schema.Codec<
  Blockquote,
  BlockquoteOf<StoredImage>
> = Schema.Struct({
  content: Schema.Array(BlockSchema),
  type: Schema.Literal("blockquote"),
});

const none = (): readonly Block[] => [];

/** The blocks a block holds, or none. */
const childrenOf: (block: Block) => readonly Block[] = Match.type<Block>().pipe(
  Match.discriminatorsExhaustive("type")({
    blockquote: ({ content }) => content,
    bulletList: ({ content }) => content.flatMap((item) => item.content),
    codeBlock: none,
    heading: none,
    horizontalRule: none,
    image: none,
    orderedList: ({ content }) => content.flatMap((item) => item.content),
    paragraph: none,
  })
);

const lengthOf = (content: readonly Inline[] | undefined) => {
  let length = 0;

  for (const node of content ?? []) {
    length += node.type === "text" ? node.text.length : 0;
  }

  return length;
};

const noText = () => 0;

/** The characters a block holds itself, its children's left out. */
const textOf: (block: Block) => number = Match.type<Block>().pipe(
  Match.discriminatorsExhaustive("type")({
    blockquote: noText,
    bulletList: noText,
    codeBlock: ({ content }) => lengthOf(content),
    heading: ({ content }) => lengthOf(content),
    horizontalRule: noText,
    image: ({ attrs }) => attrs.alt.length,
    orderedList: noText,
    paragraph: ({ content }) => lengthOf(content),
  })
);

interface Measure {
  readonly depth: number;
  readonly nodes: number;
  readonly text: number;
}

// How much the blocks hold, and how deep they nest, walked without
// recursion so a deep document cannot exhaust the stack.
const measure = (blocks: readonly Block[]): Measure => {
  let nodes = 0;
  let text = 0;
  let depth = 0;

  const waiting: { readonly block: Block; readonly depth: number }[] =
    blocks.map((block) => ({ block, depth: 1 }));

  for (let next = waiting.pop(); next !== undefined; next = waiting.pop()) {
    nodes += 1;
    text += textOf(next.block);
    depth = Math.max(depth, next.depth);

    for (const child of childrenOf(next.block)) {
      waiting.push({ block: child, depth: next.depth + 1 });
    }
  }

  return { depth, nodes, text };
};

// How deep a body's JSON may nest before it is read: a document of the
// allow-list nests at most three levels of JSON for each of its own
// (`maxBodyDepth`), and reading one deeper would only exhaust the stack.
const maxJsonDepth = 4 * (maxBodyDepth + 2);

const isJsonArray = Schema.is(Schema.Array(Schema.Unknown));

const isJsonRecord = Schema.is(Schema.Record(Schema.String, Schema.Unknown));

/**
 * JSON that nests no deeper than any document of the allow-list may,
 * measured level by level, without recursion: what a request gives as a
 * body passes it before it is read as one (`ArticleBodySchema`).
 */
export const NestedWithinSchema = Schema.Unknown.check(
  Schema.makeFilter(
    (json) => {
      let level: readonly unknown[] = [json];

      for (let depth = 0; level.length > 0; depth += 1) {
        if (depth > maxJsonDepth) {
          return false;
        }

        level = level.flatMap((value) => {
          if (isJsonArray(value)) {
            return value;
          }

          return isJsonRecord(value) ? Object.values(value) : [];
        });
      }

      return true;
    },
    { expected: "a document nested no deeper than an article's may be" }
  )
);

/**
 * An article's body: the editor's document, its nodes and marks on the
 * allow-list, within the bounds above.
 */
export const ArticleBodySchema = Schema.Struct({
  content: Schema.Array(BlockSchema),
  type: Schema.Literal("doc"),
}).check(
  Schema.makeFilter(
    ({ content }) => {
      const { depth, nodes, text } = measure(content);

      return (
        depth <= maxBodyDepth && nodes <= maxBodyNodes && text <= maxBodyText
      );
    },
    { expected: `a body of at most ${maxBodyText} characters` }
  )
);

export type ArticleBody = typeof ArticleBodySchema.Type;

/** A body with nothing in it. */
export const emptyBody: ArticleBody = { content: [], type: "doc" };

/** How many characters the body's text holds. */
export const bodyTextLength = (body: ArticleBody): number =>
  measure(body.content).text;

/** The library's files the body shows, in order, once each. */
export const bodyMediaOf = (body: ArticleBody): readonly MediaAssetId[] => {
  const found: MediaAssetId[] = [];
  const waiting = body.content.toReversed();

  for (let next = waiting.pop(); next !== undefined; next = waiting.pop()) {
    if (next.type === "image" && !found.includes(next.attrs.mediaId)) {
      found.push(next.attrs.mediaId);
    }

    waiting.push(...childrenOf(next).toReversed());
  }

  return found;
};

// An empty paragraph, where an image was: a list item or a quote keeps a
// block, so the document stays the editor's.
const emptyParagraph: Block = { type: "paragraph" };

/**
 * The body without the library's file: each image showing it becomes an
 * empty paragraph, the rest as it was. Bodies nest no deeper than
 * `maxBodyDepth`, so the walk may recurse.
 */
export const bodyWithout = (
  body: ArticleBody,
  mediaId: MediaAssetId
): ArticleBody => {
  const blocks = (content: readonly Block[]): Block[] =>
    content.map((block) => blockWithout(block));

  const items = (content: readonly ListItem[]): ListItem[] =>
    content.map((item) => ({ ...item, content: blocks(item.content) }));

  const blockWithout: (block: Block) => Block = Match.type<Block>().pipe(
    Match.discriminatorsExhaustive("type")({
      blockquote: (quote) => ({ ...quote, content: blocks(quote.content) }),
      bulletList: (list) => ({ ...list, content: items(list.content) }),
      codeBlock: (block) => block,
      heading: (block) => block,
      horizontalRule: (block) => block,
      image: (image) =>
        image.attrs.mediaId === mediaId ? emptyParagraph : image,
      orderedList: (list) => ({ ...list, content: items(list.content) }),
      paragraph: (block) => block,
    })
  );

  return { ...body, content: blocks(body.content) };
};
