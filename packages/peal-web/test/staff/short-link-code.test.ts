import { describe, expect, it } from "@effect/vitest";

import { shortLinkCodeOf } from "#staff/short-link-code.ts";

describe(shortLinkCodeOf, () => {
  it.each([
    ["AbC1234", "AbC1234"],
    ["  AbC1234 ", "AbC1234"],
    ["https://go.example.test/AbC1234", "AbC1234"],
    ["https://peal.example.test/api/l/AbC1234?utm=x", "AbC1234"],
    ["https://go.example.test/AbC1234/", "AbC1234"],
  ])("reads %j as %j", (typed, code) => {
    expect(shortLinkCodeOf(typed)).toBe(code);
  });
});
