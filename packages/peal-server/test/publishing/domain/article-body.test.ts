import { describe, expect, it } from "@effect/vitest";
import { Option, Schema } from "effect";

import {
  ArticleBodySchema,
  bodyMediaOf,
  bodyTextLength,
} from "#publishing/domain/article-body.ts";
import type { ArticleBody } from "#publishing/domain/article-body.ts";
import { articleHtml } from "#publishing/domain/article-html.ts";
import { MediaAssetIdSchema } from "#shared/domain/ids.ts";

const decode = Schema.decodeUnknownOption(ArticleBodySchema);

const imageId = MediaAssetIdSchema.make("0199a000-0000-7000-8000-000000000a01");

// A document as the editor writes it, before it is decoded.
type Written = typeof Schema.Json.Type;

const body = (content: Written): ArticleBody => {
  const decoded = decode({ content, type: "doc" });

  if (Option.isNone(decoded)) {
    throw new Error("The test's document does not decode");
  }

  return decoded.value;
};

const text = (value: string, marks?: Written) =>
  marks === undefined
    ? { text: value, type: "text" }
    : { marks, text: value, type: "text" };

const paragraph = (...content: Written[]) => ({ content, type: "paragraph" });

describe("an article's body", () => {
  it("takes the editor's headings, lists, quotes, links and images", () => {
    expect(
      Option.isSome(
        decode({
          content: [
            { attrs: { level: 2 }, content: [text("Spring")], type: "heading" },
            paragraph(
              text("Sow "),
              text("early", [{ type: "bold" }]),
              { type: "hardBreak" },
              text("here", [
                { attrs: { href: "https://garden.example/sow" }, type: "link" },
              ])
            ),
            {
              content: [
                { content: [paragraph(text("Peas"))], type: "listItem" },
              ],
              type: "bulletList",
            },
            {
              attrs: { start: 3 },
              content: [
                { content: [paragraph(text("Beans"))], type: "listItem" },
              ],
              type: "orderedList",
            },
            { content: [paragraph(text("Patience."))], type: "blockquote" },
            { type: "horizontalRule" },
            {
              attrs: { alt: "A row of peas", mediaId: imageId },
              type: "image",
            },
            { content: [text("let x = 1;")], type: "codeBlock" },
          ],
          type: "doc",
        })
      )
    ).toBeTruthy();
  });

  it("refuses what the editor does not make: other nodes, marks and links", () => {
    for (const content of [
      [{ content: [text("raw")], type: "html" }],
      [paragraph(text("x", [{ type: "underline" }]))],
      [
        paragraph(
          text("x", [
            {
              attrs: { href: ["javascript", "alert(1)"].join(":") },
              type: "link",
            },
          ])
        ),
      ],
      [
        paragraph(
          text("x", [{ attrs: { href: "data:text/html,hi" }, type: "link" }])
        ),
      ],
      [
        {
          attrs: { level: 1 },
          content: [text("Title twice")],
          type: "heading",
        },
      ],
      [{ attrs: { alt: "", mediaId: "not an id" }, type: "image" }],
    ]) {
      expect(Option.isNone(decode({ content, type: "doc" }))).toBeTruthy();
    }
  });

  it("lists the library's files it shows, once each", () => {
    const image = { attrs: { alt: "", mediaId: imageId }, type: "image" };

    expect(
      bodyMediaOf(body([image, paragraph(text("between")), image]))
    ).toStrictEqual([imageId]);
  });

  it("counts its text", () => {
    expect(
      bodyTextLength(body([paragraph(text("abc")), paragraph(text("de"))]))
    ).toBe(5);
  });
});

describe("an article's HTML", () => {
  it("is written from the document alone, every text and address escaped", () => {
    const html = articleHtml(
      body([
        {
          attrs: { level: 2 },
          content: [text("Tips & <tricks>")],
          type: "heading",
        },
        paragraph(
          text("Read "),
          text('the "guide"', [
            { type: "italic" },
            {
              attrs: { href: 'https://garden.example/?a=1&b="2"' },
              type: "link",
            },
          ]),
          { type: "hardBreak" },
          text("<script>alert(1)</script>", [{ type: "code" }])
        ),
      ]),
      new Map()
    );

    expect(html).toBe(
      '<h2>Tips &amp; &lt;tricks&gt;</h2>\n<p>Read <a href="https://garden.example/?a=1&amp;b=&quot;2&quot;"><em>the &quot;guide&quot;</em></a><br><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></p>'
    );
  });

  it("writes lists, quotes, rules and code blocks", () => {
    const html = articleHtml(
      body([
        {
          content: [
            { content: [paragraph(text("Peas"))], type: "listItem" },
            {
              content: [
                paragraph(text("Beans")),
                {
                  content: [
                    { content: [paragraph(text("Runner"))], type: "listItem" },
                  ],
                  type: "bulletList",
                },
              ],
              type: "listItem",
            },
          ],
          type: "bulletList",
        },
        {
          attrs: { start: 3 },
          content: [{ content: [paragraph(text("Third"))], type: "listItem" }],
          type: "orderedList",
        },
        { content: [paragraph(text("Wait."))], type: "blockquote" },
        { type: "horizontalRule" },
        { content: [text("a < b")], type: "codeBlock" },
      ]),
      new Map()
    );

    expect(html).toBe(
      [
        "<ul><li><p>Peas</p></li><li><p>Beans</p><ul><li><p>Runner</p></li></ul></li></ul>",
        '<ol start="3"><li><p>Third</p></li></ol>',
        "<blockquote><p>Wait.</p></blockquote>",
        "<hr>",
        "<pre><code>a &lt; b</code></pre>",
      ].join("\n")
    );
  });

  it("shows an image at the address the site gave it, and leaves out one it has none for", () => {
    const image = {
      attrs: { alt: 'Peas "in a row"', mediaId: imageId },
      type: "image",
    };

    expect(
      articleHtml(
        body([image]),
        new Map([
          [imageId, "https://garden.example/wp-content/uploads/peas.jpg"],
        ])
      )
    ).toBe(
      '<figure><img src="https://garden.example/wp-content/uploads/peas.jpg" alt="Peas &quot;in a row&quot;"></figure>'
    );
    expect(articleHtml(body([image]), new Map())).toBe("");
  });
});
