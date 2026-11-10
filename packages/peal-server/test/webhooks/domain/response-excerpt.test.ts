import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  excerptOf,
  maxExcerptLength,
} from "#webhooks/domain/response-excerpt.ts";

describe(excerptOf, () => {
  it("keeps the start of an answer, on one line", () => {
    expect(excerptOf('{"error":\n\t"signature mismatch"}\r\n')).toStrictEqual(
      Option.some('{"error": "signature mismatch"}')
    );
  });

  it("keeps 256 characters at most, never half of one", () => {
    const excerpt = Option.getOrThrow(excerptOf("👍".repeat(1000)));

    expect(excerpt).toBe("👍".repeat(maxExcerptLength));
  });

  it("drops control and invisible characters", () => {
    expect(excerptOf("\u001B[31mno\u0000pe‮​ ﻿now")).toStrictEqual(
      Option.some("[31mno pe now")
    );
  });

  it("keeps no half of a surrogate pair, a cut's or the receiver's own", () => {
    const lone = String.fromCodePoint(0xd8_00);

    const cut = excerptOf(`${"a".repeat(maxExcerptLength * 4 - 1)}👍`);
    const given = excerptOf(`no${lone}pe`);

    expect(Option.getOrThrow(cut).isWellFormed()).toBeTruthy();
    expect(Option.getOrThrow(given).isWellFormed()).toBeTruthy();
  });

  it("keeps nothing of an answer with nothing to read", () => {
    expect(excerptOf("")).toStrictEqual(Option.none());
    expect(excerptOf(" \n\u0000\t")).toStrictEqual(Option.none());
  });
});
