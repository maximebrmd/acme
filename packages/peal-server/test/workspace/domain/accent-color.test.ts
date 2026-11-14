import { describe, expect, it } from "@effect/vitest";
import { Result } from "effect";

import {
  accentSurfaces,
  contrastRatio,
  minAccentContrast,
  parseAccentColor,
} from "#workspace/domain/accent-color.ts";

const colour = (input: string) => Result.getOrThrow(parseAccentColor(input));

const refusal = (input: string) => {
  const parsed = parseAccentColor(input);

  return Result.isFailure(parsed) ? parsed.failure.reason : "taken";
};

describe(contrastRatio, () => {
  it("measures as WCAG 2 does", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // DESIGN.md: white on Peal's blue is 5.2:1, lavender 2.1:1, yellow
    // 1.5:1 on white.
    expect(contrastRatio("#415EEE", "#FFFFFF")).toBeCloseTo(5.2, 1);
    expect(contrastRatio("#B9A6FF", "#FFFFFF")).toBeCloseTo(2.1, 1);
    expect(contrastRatio("#FFCA00", "#FFFFFF")).toBeCloseTo(1.5, 1);
  });

  it("reads the same either way round", () => {
    expect(contrastRatio("#FFFFFF", "#415EEE")).toBeCloseTo(
      contrastRatio("#415EEE", "#FFFFFF"),
      10
    );
  });
});

describe(parseAccentColor, () => {
  it("keeps six hexadecimal digits, in capitals", () => {
    expect(["#415EEE", "#415eee", "#0c0a09"].map(colour)).toStrictEqual([
      "#415EEE",
      "#415EEE",
      "#0C0A09",
    ]);
  });

  it("takes nothing else a stylesheet would read as a colour", () => {
    const refused = [
      "",
      "415EEE",
      "#FFF",
      "#415EEEFF",
      "#41 5EEE",
      "#GGGGGG",
      "blue",
      "rgb(65, 94, 238)",
      "#415EEE;background:url(x)",
      "var(--primary)",
      "#415EEE\n",
      " #415EEE",
    ].map(refusal);

    expect(new Set(refused)).toStrictEqual(new Set(["malformed"]));
  });

  it("refuses a colour that a line on Peal's light pages would lose", () => {
    // Below 3:1 on the card or the page (WCAG 1.4.11, a line that must
    // be seen): DESIGN.md's lavender and yellow, a light grey.
    expect(
      ["#B9A6FF", "#FFCA00", "#D6D3D1", "#FFFFFF"].map(refusal)
    ).toStrictEqual([
      "lowContrast",
      "lowContrast",
      "lowContrast",
      "lowContrast",
    ]);

    // Peal's blue, its ink, a dark green: readable on both.
    expect(["#415EEE", "#0C0A09", "#166534"].map(colour)).toStrictEqual([
      "#415EEE",
      "#0C0A09",
      "#166534",
    ]);
  });

  it("measures against every surface the colour sits on", () => {
    expect(minAccentContrast).toBe(3);
    expect(accentSurfaces).toStrictEqual(["#FFFFFF", "#FAFAF9"]);

    // About 3.01:1 on white, but under 3:1 on the page's background.
    const between = "#949494";

    expect(contrastRatio(between, "#FFFFFF")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(between, "#FAFAF9")).toBeLessThan(3);
    expect(refusal(between)).toBe("lowContrast");
  });
});
