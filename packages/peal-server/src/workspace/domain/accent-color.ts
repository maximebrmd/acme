import { Result } from "effect";

import { InvalidPartnerAccent } from "./invalid-partner-accent.ts";

/**
 * The least contrast a partner's accent colour keeps with every surface
 * it is drawn on: 3:1, what WCAG 2's non-text contrast (1.4.11) asks of a
 * line that must be seen. DESIGN.md draws it as a line, never as text or
 * as a button, so this is the bar it must clear.
 */
export const minAccentContrast = 3;

/**
 * What the colour sits on, as DESIGN.md names them: the card of a hosted
 * page (`card`) and the page around it (`background`). Peal is light
 * only, so there is no dark surface to clear.
 */
export const accentSurfaces = ["#FFFFFF", "#FAFAF9"] as const;

// Six hexadecimal digits after a hash, and nothing else: no shorthand, no
// alpha, no name or function, no space around it, so the value is never more than a colour
// wherever it is written.
const hexColour = /^#[0-9A-F]{6}$/u;

// A channel of sRGB, linearised as WCAG 2 defines relative luminance.
const linear = (channel: number): number => {
  const value = channel / 255;

  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const luminanceOf = (colour: string): number => {
  const channel = (start: number) =>
    linear(Number.parseInt(colour.slice(start, start + 2), 16));

  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};

/**
 * The contrast ratio of two `#RRGGBB` colours, as WCAG 2 measures it:
 * from 1 (the same) to 21 (black on white), whichever is lighter.
 */
export const contrastRatio = (first: string, second: string): number => {
  const [lighter, darker] = [luminanceOf(first), luminanceOf(second)].toSorted(
    (left, right) => right - left
  );

  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
};

/**
 * A partner's accent colour as the hosted pages draw it: `#RRGGBB`, kept
 * in capitals, with at least `minAccentContrast` against every surface of
 * `accentSurfaces`. Anything else is refused, never adjusted: a partner
 * chooses another colour.
 */
export const parseAccentColor = (
  input: string
): Result.Result<string, InvalidPartnerAccent> => {
  const colour = input.toUpperCase();

  if (!hexColour.test(colour)) {
    return Result.fail(new InvalidPartnerAccent({ reason: "malformed" }));
  }

  return accentSurfaces.every(
    (surface) => contrastRatio(colour, surface) >= minAccentContrast
  )
    ? Result.succeed(colour)
    : Result.fail(new InvalidPartnerAccent({ reason: "lowContrast" }));
};
