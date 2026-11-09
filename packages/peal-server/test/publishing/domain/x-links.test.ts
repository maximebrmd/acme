import { describe, expect, it } from "@effect/vitest";

import { measureText } from "#publishing/domain/text-length.ts";
import { xLinksIn } from "#publishing/domain/x-links.ts";

import { indexedLinkCases, linkCases, weightedCases } from "./x-conformance.ts";

const urlsIn = (text: string) => xLinksIn(text).map(({ url }) => url);

describe(xLinksIn, () => {
  it.each(linkCases)("$description", ({ expected, text }) => {
    expect(urlsIn(text)).toStrictEqual(expected);
  });

  it.each(indexedLinkCases)(
    "$description, with offsets",
    ({ expected, text }) => {
      expect(
        xLinksIn(text).map(({ end, start, url }) => ({
          indices: [start, end],
          url,
        }))
      ).toStrictEqual(expected);
    }
  );

  it.each([
    { expected: ["peal.social"], text: "Read peal.social now" },
    { expected: ["example.com/path"], text: "see example.com/path." },
    // No top-level domain X knows: no link.
    { expected: [], text: "https://localhost/x and peal.example" },
    // A bare domain after these is part of something else.
    { expected: [], text: "x-.example.com _example.com /example.com" },
    // The long s and the Kelvin sign are no ASCII letters here.
    { expected: ["peal.social"], text: "peal.socialſ" },
    { expected: ["peal.social"], text: "\u{1F600}peal.social" },
  ])("finds $expected in $text", ({ expected, text }) => {
    expect(urlsIn(text)).toStrictEqual(expected);
  });
});

describe("X's weighted length", () => {
  it.each(weightedCases)("$description", ({ text, weightedLength }) => {
    expect(measureText(text, "weighted")).toBe(weightedLength);
  });
});
