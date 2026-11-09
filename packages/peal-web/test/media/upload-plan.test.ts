import { describe, expect, it } from "@effect/vitest";
import type { SignedRequest, UploadPart, UploadTarget } from "peal-contract";
import { DateTime, Option } from "effect";

import { progressOf, slicesOf } from "#media/upload-plan.ts";

const expiresAt = DateTime.makeUnsafe("2026-06-15T07:10:00Z");

const request = (name: string): SignedRequest => ({
  headers: {},
  method: "PUT",
  url: `https://store.example.test/${name}`,
});

const mebibyte = 1024 * 1024;

// A 17 MiB file in parts of 8 MiB: 8, 8 and 1 MiB.
const byteSize = 17 * mebibyte;

const first: UploadPart = {
  byteSize: 8 * mebibyte,
  partNumber: 1,
  request: request("part-1"),
};

const second: UploadPart = {
  byteSize: 8 * mebibyte,
  partNumber: 2,
  request: request("part-2"),
};

const last: UploadPart = {
  byteSize: mebibyte,
  partNumber: 3,
  request: request("part-3"),
};

const parts = [first, second, last];

const multipart = (planned: readonly UploadPart[]): UploadTarget => ({
  _tag: "multipart",
  expiresAt,
  partSize: 8 * mebibyte,
  parts: planned,
});

describe(slicesOf, () => {
  it("sends a single upload's file whole", () => {
    expect(
      slicesOf({ _tag: "single", expiresAt, request: request("file") }, 500)
    ).toStrictEqual(
      Option.some([
        { end: 500, partNumber: 1, request: request("file"), start: 0 },
      ])
    );
  });

  it("gives each part its bytes, in order", () => {
    const slices = slicesOf(multipart(parts.toReversed()), byteSize);

    expect(
      Option.getOrThrow(slices).map(({ end, partNumber, start }) => ({
        end,
        partNumber,
        start,
      }))
    ).toStrictEqual([
      { end: 8 * mebibyte, partNumber: 1, start: 0 },
      { end: 16 * mebibyte, partNumber: 2, start: 8 * mebibyte },
      { end: 17 * mebibyte, partNumber: 3, start: 16 * mebibyte },
    ]);
  });

  it.each([
    { label: "a missing part", planned: [first, last] },
    { label: "no parts", planned: [] },
    {
      label: "a last part past the end",
      planned: [first, second, { ...last, byteSize: 2 * mebibyte }],
    },
    {
      label: "a short part before the last",
      planned: [{ ...first, byteSize: 7 * mebibyte }, second, last],
    },
    {
      label: "a part that does not start at 1",
      planned: parts.map((part) => ({
        ...part,
        partNumber: part.partNumber + 1,
      })),
    },
  ] satisfies { label: string; planned: UploadPart[] }[])(
    "refuses a plan with $label",
    ({ planned }) => {
      expect(slicesOf(multipart(planned), byteSize)).toStrictEqual(
        Option.none()
      );
    }
  );

  it("refuses a plan for a file of another size", () => {
    expect(slicesOf(multipart(parts), byteSize + 1)).toStrictEqual(
      Option.none()
    );
  });
});

describe(progressOf, () => {
  it("adds up what every part sent", () => {
    expect(
      progressOf(
        new Map([
          [1, 50],
          [2, 25],
        ]),
        200
      )
    ).toBe(0.375);
  });

  it("never goes past the whole file", () => {
    expect(progressOf(new Map([[1, 300]]), 200)).toBe(1);
  });

  it("starts at nothing", () => {
    expect(progressOf(new Map(), 200)).toBe(0);
  });
});
