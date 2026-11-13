import { describe, expect, it } from "@effect/vitest";
import { Option, Schema } from "effect";
import { maxMediaFileNameLength } from "peal-contract";

import {
  FileNameSchema,
  fileNameOf,
  maxFileNameLength,
  nameInAddress,
} from "#media/domain/file-name.ts";

// A file's name is what a member's device or an address called it: the
// member's own data, kept as text to find the file by and to show.

const nul = String.fromCodePoint(0);
const loneHigh = String.fromCodePoint(0xd8_00);
const escape = String.fromCodePoint(0x1b);
const override = String.fromCodePoint(0x20_2e);
const replacement = String.fromCodePoint(0xff_fd);

const named = (raw: string) => Option.getOrNull(fileNameOf(raw));

describe(fileNameOf, () => {
  it("keeps an ordinary name as it is, accents and spaces included", () => {
    expect(named("Été 2026 — plage.jpg")).toBe("Été 2026 — plage.jpg");
  });

  it("keeps the name alone, never the folders a client sent with it", () => {
    expect(named("/home/someone/Pictures/launch.png")).toBe("launch.png");
    expect(named(String.raw`C:\Users\someone\Desktop\launch.png`)).toBe(
      "launch.png"
    );
  });

  it("drops what Postgres refuses and what a terminal or a page acts on", () => {
    expect(named(`a${nul}b${escape}[31m.png`)).toBe("ab[31m.png");
    expect(named(`a${loneHigh}.png`)).toBe(`a${replacement}.png`);
    // A mark that reverses the text after it could disguise the extension.
    expect(named(`photo${override}gnp.exe`)).toBe("photognp.exe");
    expect(named("two\nlines.png")).toBe("two lines.png");
  });

  it("cuts a long name at a number of characters, never inside one", () => {
    const long = `${"👍".repeat(maxFileNameLength + 10)}.png`;
    const kept = named(long) ?? "";

    // Characters, not UTF-16 units: each of these is two.
    expect(kept.match(/./gsu)).toHaveLength(maxFileNameLength);
    expect(kept.isWellFormed()).toBeTruthy();
  });

  it("keeps a name cut on a space without the space", () => {
    expect(named(`${"a".repeat(254)} b.jpg`)).toBe("a".repeat(254));
  });

  it("keeps a name composed, as a keyboard types it", () => {
    expect(named("e\u0301te\u0301.png")).toBe("\u00E9t\u00E9.png");
  });

  it("drops the characters that show nothing", () => {
    expect(named("in\u200Bvoice\u2060.pdf")).toBe("invoice.pdf");
    expect(named("a\u{E0041}\u{E0042}b\uFEFF.png")).toBe("ab.png");
    expect(fileNameOf("\u200B\u200C\u200D")).toStrictEqual(Option.none());
  });

  it("answers none or a name the schema takes, whatever it is given", () => {
    const pieces = [
      " ",
      "a",
      "\u00E9",
      "e\u0301",
      "\u200B",
      "/",
      "\\",
      "\n",
      "👍",
      "\uD800",
      "\u0000",
      ".",
    ];

    for (let seed = 1; seed < 400; seed += 1) {
      const raw = Array.from(
        { length: (seed * 7) % 300 },
        (_, index) => pieces[(seed * 31 + index * 17) % pieces.length] ?? ""
      ).join("");

      const name = fileNameOf(raw);

      expect(
        Option.isNone(name) || Schema.is(FileNameSchema)(name.value)
      ).toBeTruthy();
    }
  });

  it("is none when nothing is left of it", () => {
    expect(fileNameOf("")).toStrictEqual(Option.none());
    expect(fileNameOf("   ")).toStrictEqual(Option.none());
    expect(fileNameOf("/home/someone/")).toStrictEqual(Option.none());
    expect(fileNameOf(`${nul}${escape}`)).toStrictEqual(Option.none());
  });
});

const nameIn = (url: string) => Option.getOrNull(nameInAddress(url));

describe(nameInAddress, () => {
  it("takes the last segment of the address's path, decoded", () => {
    expect(nameIn("https://cdn.example.com/a/b/Launch%20day.jpg")).toBe(
      "Launch day.jpg"
    );
    expect(nameIn("https://cdn.example.com/photo.png?size=large#top")).toBe(
      "photo.png"
    );
  });

  it("keeps a segment that does not decode as it is written", () => {
    expect(nameIn("https://cdn.example.com/100%.png")).toBe("100%.png");
  });

  it("never reads an encoded slash as a folder of the name", () => {
    expect(nameIn("https://cdn.example.com/a%2Fb.png")).toBe("b.png");
  });

  it("names nothing after a segment that is no file's name", () => {
    // A query is never read, and a path without an extension may be a
    // share link's token.
    expect(
      nameIn("https://cdn.example.com/download?file=report.pdf")
    ).toBeNull();
    expect(nameIn("https://cdn.example.com/s/k3Jd92LmQx7Pz0aB4vW8")).toBeNull();
    expect(nameIn("https://cdn.example.com/picture")).toBeNull();
  });

  it("names nothing after a segment that looks like a token, extension or not", () => {
    expect(
      nameIn("https://cdn.example.com/f/9fK2mQ7xLp3Zr8Vb1Nc6Wd4T.jpg")
    ).toBeNull();
    // A name with words and a date is a name.
    expect(nameIn("https://cdn.example.com/IMG_20261113_101500.jpg")).toBe(
      "IMG_20261113_101500.jpg"
    );
  });

  it("is none for an address without a file in its path", () => {
    expect(nameInAddress("https://cdn.example.com/")).toStrictEqual(
      Option.none()
    );
    expect(nameInAddress("https://cdn.example.com")).toStrictEqual(
      Option.none()
    );
    expect(nameInAddress("not an address")).toStrictEqual(Option.none());
  });
});

describe("the contract's bound", () => {
  it("is the one the server keeps", () => {
    expect(maxFileNameLength).toBe(maxMediaFileNameLength);
  });
});
