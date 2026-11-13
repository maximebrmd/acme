// DESIGN.md and tokens.css say the same thing: every colour DESIGN.md gives a
// token, and the radius, is the value tokens.css holds. The web app, the docs
// and the site all read tokens.css, so this keeps the three from drifting
// from the design and from each other.
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const design = readFileSync(
  path.join(import.meta.dirname, "../../../DESIGN.md"),
  "utf-8"
);

const tokensFile = readFileSync(
  path.join(import.meta.dirname, "../src/styles/tokens.css"),
  "utf-8"
);

const tokens = new Map(
  [...tokensFile.matchAll(/--(?<name>[a-z0-9-]+):\s*(?<value>[^;]+);/gu)].map(
    (match) => [
      match.groups?.["name"] ?? "",
      (match.groups?.["value"] ?? "").trim().toLowerCase(),
    ]
  )
);

// The first hex colour DESIGN.md writes after `prefix`, lower-cased.
const colourAfter = (prefix: RegExp) =>
  new RegExp(`${prefix.source}\`(?<hex>#[0-9A-F]{6})\``, "mu")
    .exec(design)
    ?.groups?.["hex"]?.toLowerCase();

// The rows of the Neutrals table: `background` | `#FAFAF9`, and rows naming
// two tokens, `card`, `popover` | `#FFFFFF`.
const neutralRows = [
  ...design.matchAll(
    /^\| (?<names>(?:`[a-z-]+`(?:, )?)+) +\| `(?<hex>#[0-9A-F]{6})` +\|/gmu
  ),
].flatMap((row) =>
  [...(row.groups?.["names"] ?? "").matchAll(/`(?<name>[a-z-]+)`/gu)].map(
    (token) => ({
      name: token.groups?.["name"] ?? "",
      value: (row.groups?.["hex"] ?? "").toLowerCase(),
    })
  )
);

describe("DESIGN.md and tokens.css", () => {
  it("reads the Neutrals table", () => {
    expect(neutralRows.map((row) => row.name)).toContain("background");
    expect(neutralRows.length).toBeGreaterThanOrEqual(8);
  });

  it.each(neutralRows)("gives --$name the value $value", ({ name, value }) => {
    expect(tokens.get(name)).toBe(value);
  });

  it.each([
    { name: "Blue", token: "brand" },
    { name: "Lavender", token: "lavender" },
    { name: "Yellow", token: "sun" },
  ])("gives $name to --$token", ({ name, token }) => {
    const value = colourAfter(new RegExp(`^\\| ${name} +\\| `, "u"));

    expect(value).toBeDefined();
    expect(tokens.get(token)).toBe(value);
  });

  it("gives blue's hover to --brand-hover", () => {
    expect(tokens.get("brand-hover")).toBe(colourAfter(/Blue's hover is /u));
  });

  it("gives destructive and destructive-text their values", () => {
    expect(tokens.get("destructive")).toBe(colourAfter(/`destructive` is /u));
    expect(tokens.get("destructive-text")).toBe(
      colourAfter(/`destructive-text`,\s+/u)
    );
  });

  it("gives the radius of controls and cards to --radius", () => {
    const pixels = /Radius: (?<pixels>\d+) px for controls/u.exec(design)
      ?.groups?.["pixels"];

    expect(tokens.get("radius")).toBe(`${Number(pixels) / 16}rem`);
  });
});
