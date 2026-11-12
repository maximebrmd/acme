import { describe, expect, it } from "@effect/vitest";

import { pasteOf } from "#posts/paste.ts";

const image = { name: "chart.png", type: "image/png" };
const video = { name: "clip.mp4", type: "video/mp4" };

const clipboard = (files: readonly object[], text: string) => ({
  files,
  getData: (format: string) => (format === "text/plain" ? text : ""),
});

describe(pasteOf, () => {
  it("takes the files a paste holds", () => {
    expect(pasteOf(clipboard([image, video], ""))).toStrictEqual({
      _tag: "files",
      files: [image, video],
    });
  });

  it("leaves text without a file to the editor", () => {
    expect(pasteOf(clipboard([], "Launch day"))).toStrictEqual({
      _tag: "text",
    });
  });

  it("takes the files and pastes no text when the clipboard holds both", () => {
    expect(pasteOf(clipboard([image], "chart.png"))).toStrictEqual({
      _tag: "files",
      files: [image],
    });
  });

  it("leaves a paste without a clipboard to the editor", () => {
    expect(pasteOf(null)).toStrictEqual({ _tag: "text" });
  });
});
