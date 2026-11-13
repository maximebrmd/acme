import { describe, expect, it } from "@effect/vitest";

import { storableLine, storableText } from "#shared/domain/platform-text.ts";

// What a platform, or anyone who writes through one, hands Peal as text,
// made storable and safe to show before it is kept.

const nul = String.fromCodePoint(0);
const loneHigh = String.fromCodePoint(0xd8_00);
const loneLow = String.fromCodePoint(0xdc_00);
const escape = String.fromCodePoint(0x1b);
const bell = String.fromCodePoint(7);
const c1 = String.fromCodePoint(0x9b);
const del = String.fromCodePoint(0x7f);
const override = String.fromCodePoint(0x20_2e);
const isolate = String.fromCodePoint(0x20_66);
const replacement = String.fromCodePoint(0xff_fd);

describe(storableText, () => {
  it("keeps ordinary text as it is, line breaks, tabs and emoji included", () => {
    const text = "Bonjour,\n\tça va ? 👩‍👩‍👧 مرحبا";

    expect(storableText(text, 100)).toBe(text);
  });

  it("drops what Postgres refuses and what a terminal or a log acts on", () => {
    expect(storableText(`a${nul}b`, 100)).toBe("ab");
    expect(storableText(`a${escape}[31mb${bell}${c1}${del}`, 100)).toBe(
      "a[31mb"
    );
    // A lone half of a pair is no character: it is replaced, never kept.
    expect(storableText(`a${loneHigh}b${loneLow}`, 100)).toBe(
      `a${replacement}b${replacement}`
    );
    expect(storableText("a\r\nb\rc", 100)).toBe("a\nb\nc");
  });

  it("cuts at a number of characters, never inside one", () => {
    expect(storableText("abcdef", 3)).toBe("abc");
    expect(storableText("a👍b", 2)).toBe("a👍");
    expect(storableText("abc", 0)).toBe("");
  });

  it("answers text that JSON and Postgres both take, whatever it is given", () => {
    // The halves the wrong way round: together the right way they are one
    // character.
    const hostile = [nul, loneLow, loneHigh, escape, c1, override, "x"].join(
      ""
    );

    const stored = storableText(hostile.repeat(50), 1000);

    expect(stored.isWellFormed()).toBeTruthy();
    expect(stored).not.toContain(nul);
    expect(stored).toBe(`${replacement}${replacement}${override}x`.repeat(50));
  });
});

describe(storableLine, () => {
  it("makes one line of a name: no line break, no tab, no run of spaces", () => {
    expect(storableLine("  Ada\n\nLovelace\t(she) ", 100)).toBe(
      "Ada Lovelace (she)"
    );
  });

  it("drops the marks that reorder or hide the text around a name", () => {
    expect(storableLine(`Ada${override}ecalevoL${isolate}`, 100)).toBe(
      "AdaecalevoL"
    );
  });

  it("never ends with a space, even when the cut falls on one", () => {
    expect(storableLine("ab cd", 3)).toBe("ab");
  });

  it("drops controls and bounds the length like a text", () => {
    expect(storableLine(`a${nul}${escape}b`, 100)).toBe("ab");
    expect(storableLine("abcdef", 4)).toBe("abcd");
    expect(storableLine(loneHigh, 4)).toBe(replacement);
  });
});
