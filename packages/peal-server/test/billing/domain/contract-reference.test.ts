import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  readReference,
  referenceFrom,
  sameReference,
} from "#billing/domain/contract-reference.ts";

const bytes = Uint8Array.from([
  0xff, 0x00, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
]);

describe(referenceFrom, () => {
  it("writes 60 bits as twelve characters in three groups", () => {
    const reference = referenceFrom(bytes);

    expect(reference).toMatch(
      /^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){2}$/u
    );
    expect(referenceFrom(bytes)).toBe(reference);
  });

  it("gives other bytes another reference", () => {
    expect(referenceFrom(bytes)).not.toBe(
      referenceFrom(Uint8Array.from([...bytes].toReversed()))
    );
  });
});

describe(readReference, () => {
  it("reads a reference however it was typed", () => {
    const reference = referenceFrom(bytes);
    const typed = ` ${reference.toLowerCase().replaceAll("-", " ")} `;

    expect(readReference(typed)).toStrictEqual(Option.some(reference));
  });

  it("reads the letters people mistake for digits", () => {
    expect(readReference("OIL0-0000-0000")).toStrictEqual(
      Option.some("0110-0000-0000")
    );
  });

  it("refuses what is no reference", () => {
    expect(readReference("")).toStrictEqual(Option.none());
    expect(readReference("0000-0000-000")).toStrictEqual(Option.none());
    expect(readReference("0000-0000-0000-0")).toStrictEqual(Option.none());
    expect(readReference("UUUU-UUUU-UUUU")).toStrictEqual(Option.none());
  });
});

describe(sameReference, () => {
  it("tells equal references from others", () => {
    expect(sameReference("0110-0000-0000", "0110-0000-0000")).toBeTruthy();
    expect(sameReference("0110-0000-0000", "0110-0000-0001")).toBeFalsy();
    expect(sameReference("0110-0000-0000", "0110")).toBeFalsy();
  });
});
