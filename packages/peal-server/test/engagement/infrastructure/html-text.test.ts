import { describe, expect, it } from "@effect/vitest";

import { textOfHtml } from "#engagement/infrastructure/platforms/html-text.ts";

// A status's HTML as plain text: what a comment says, never markup.

describe(textOfHtml, () => {
  it("keeps paragraphs and line breaks, and drops every tag", () => {
    expect(
      textOfHtml(
        '<p>One<br>two <a href="https://example.com">link</a></p><p>Three</p>'
      )
    ).toBe("One\ntwo link\n\nThree");
  });

  it("decodes entities last, so escaped markup stays text", () => {
    expect(textOfHtml("<p>&lt;b&gt; &amp;amp; &#233; &#x1F44D;</p>")).toBe(
      "<b> &amp; é 👍"
    );
  });

  it("makes no character of a reference that names none", () => {
    // Half a surrogate pair, NUL, and a number past the last code point
    // stay as they were written: text, and well formed.
    const text = textOfHtml("<p>a&#xD800;b&#xDFFF;c&#0;d&#x110000;</p>");

    expect(text).toBe("a&#xD800;b&#xDFFF;c&#0;d&#x110000;");
    expect(text.isWellFormed()).toBeTruthy();
  });
});
