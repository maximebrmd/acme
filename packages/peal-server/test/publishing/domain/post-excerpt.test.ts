import { describe, expect, it } from "@effect/vitest";

import { excerptOf } from "#publishing/domain/post-excerpt.ts";

describe(excerptOf, () => {
  it("keeps a short text whole, on one line", () => {
    expect(excerptOf("A synthetic\n\npost  with\tspaces")).toBe(
      "A synthetic post with spaces"
    );
  });

  it("cuts at as many characters as a reader counts, never inside one", () => {
    const family = "👩‍👩‍👧";

    expect(excerptOf(`${family}${"a".repeat(10)}`, 3)).toBe(`${family}aa`);
    expect(excerptOf("x".repeat(200))).toHaveLength(140);
  });
});
