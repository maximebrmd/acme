import { describe, expect, it } from "@effect/vitest";

import { pasteOf } from "#posts/paste.ts";

const image = { name: "chart.png", type: "image/png" };
const video = { name: "clip.mp4", type: "video/mp4" };

const clipboard = (
  files: readonly object[],
  { html = "", text = "" }: { readonly html?: string; readonly text?: string }
) => ({
  files,
  getData: (format: string) => {
    if (format === "text/plain") {
      return text;
    }

    return format === "text/html" ? html : "";
  },
});

describe(pasteOf, () => {
  it("takes the files a paste holds alone", () => {
    expect(pasteOf(clipboard([image, video], {}))).toStrictEqual({
      _tag: "files",
      files: [image, video],
    });
  });

  it("leaves text without a file to the editor", () => {
    expect(pasteOf(clipboard([], { text: "Launch day" }))).toStrictEqual({
      _tag: "text",
    });
  });

  it("pastes a spreadsheet's cells as text, not the picture of them", () => {
    expect(
      pasteOf(
        clipboard([image], {
          html: "<table><tr><td>Launch day</td></tr></table>",
          text: "Launch day",
        })
      )
    ).toStrictEqual({ _tag: "text" });
  });

  it("pastes text when a file comes with any text or markup", () => {
    expect(pasteOf(clipboard([image], { text: "chart.png" }))).toStrictEqual({
      _tag: "text",
    });
    expect(pasteOf(clipboard([image], { html: "<img>" }))).toStrictEqual({
      _tag: "text",
    });
  });

  it("leaves a paste without a clipboard to the editor", () => {
    expect(pasteOf(null)).toStrictEqual({ _tag: "text" });
  });
});
