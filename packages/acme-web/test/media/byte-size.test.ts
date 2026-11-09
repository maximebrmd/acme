import { describe, expect, it } from "@effect/vitest";

import { readableSize } from "#media/byte-size.ts";

describe(readableSize, () => {
  it.each([
    [0, { unit: "byte", value: 0 }],
    [1023, { unit: "byte", value: 1023 }],
    [3660, { unit: "kilobyte", value: 3660 / 1024 }],
    [16 * 1024 * 1024, { unit: "megabyte", value: 16 }],
    [1024 ** 3, { unit: "gigabyte", value: 1 }],
    [3 * 1024 ** 4, { unit: "gigabyte", value: 3072 }],
  ] as const)("reads %i bytes as %o", (bytes, size) => {
    expect(readableSize(bytes)).toStrictEqual(size);
  });
});
