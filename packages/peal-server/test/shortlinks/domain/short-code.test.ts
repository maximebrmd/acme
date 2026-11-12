import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  codeAlphabet,
  codeLength,
  codeOf,
} from "#shortlinks/domain/short-code.ts";

describe("a short code", () => {
  it("is seven characters of digits and ASCII letters, one a fair byte", () => {
    const code = codeOf(new Uint8Array([0, 9, 10, 35, 36, 61, 62]));

    expect(Option.getOrThrow(code)).toBe("09AZaz0");
    expect(codeLength).toBe(7);
    expect(codeAlphabet).toHaveLength(62);
  });

  it("skips bytes that would favour the first characters", () => {
    expect(
      Option.getOrThrow(codeOf(new Uint8Array([248, 255, 1, 2, 3, 4, 5, 6, 7])))
    ).toBe("1234567");
  });

  it("is none when too few bytes were fair", () => {
    expect(
      Option.isNone(codeOf(new Uint8Array([1, 2, 250, 251, 3])))
    ).toBeTruthy();
  });
});
