import { describe, expect, it } from "@effect/vitest";

import {
  hasEveryPart,
  maxPartCount,
  minPartSize,
  plannedParts,
  planUpload,
} from "#media/domain/upload-plan.ts";

const mebibyte = 1024 * 1024;

const sizing = { multipartThreshold: 16 * mebibyte, partSize: 8 * mebibyte };

describe(planUpload, () => {
  it.each([1, 16 * mebibyte])("sends %i bytes in one request", (byteSize) => {
    expect(planUpload(byteSize, sizing)).toStrictEqual({ _tag: "single" });
  });

  it("splits a larger file into parts of the planned size", () => {
    expect(planUpload(16 * mebibyte + 1, sizing)).toStrictEqual({
      _tag: "multipart",
      partCount: 3,
      partSize: 8 * mebibyte,
    });
  });

  it("never plans parts under the stores' 5 MiB minimum", () => {
    const plan = planUpload(20 * mebibyte, {
      multipartThreshold: mebibyte,
      partSize: mebibyte,
    });

    expect(plan).toStrictEqual({
      _tag: "multipart",
      partCount: 4,
      partSize: minPartSize,
    });
  });

  it("grows parts in whole mebibytes to stay within 10,000 parts", () => {
    const byteSize = 100_000 * mebibyte;
    const plan = planUpload(byteSize, sizing);

    expect(plan).toStrictEqual({
      _tag: "multipart",
      partCount: 10_000,
      partSize: 10 * mebibyte,
    });
  });
});

describe(plannedParts, () => {
  it("numbers parts from 1, all full but the last", () => {
    expect(plannedParts(12 * mebibyte + 5, 5 * mebibyte)).toStrictEqual([
      { byteSize: 5 * mebibyte, partNumber: 1 },
      { byteSize: 5 * mebibyte, partNumber: 2 },
      { byteSize: 2 * mebibyte + 5, partNumber: 3 },
    ]);
  });

  it("ends with a full part when the size divides evenly", () => {
    const parts = plannedParts(10 * mebibyte, 5 * mebibyte);

    expect(parts.map((part) => part.byteSize)).toStrictEqual([
      5 * mebibyte,
      5 * mebibyte,
    ]);
  });

  it("covers the file exactly, within the stores' part count", () => {
    const byteSize = 1024 * mebibyte - 7;
    const plan = planUpload(byteSize, sizing);

    expect(plan._tag).toBe("multipart");

    const parts =
      plan._tag === "multipart" ? plannedParts(byteSize, plan.partSize) : [];

    expect(parts.reduce((total, part) => total + part.byteSize, 0)).toBe(
      byteSize
    );
    expect(parts.length).toBeLessThanOrEqual(maxPartCount);
  });
});

describe(hasEveryPart, () => {
  const byteSize = 12 * mebibyte;
  const partSize = 5 * mebibyte;
  const planned = plannedParts(byteSize, partSize);

  it("accepts exactly the planned parts", () => {
    expect(hasEveryPart(byteSize, partSize, planned)).toBeTruthy();
  });

  it("refuses a missing part", () => {
    expect(hasEveryPart(byteSize, partSize, planned.slice(0, 2))).toBeFalsy();
  });

  it("refuses a part of another size", () => {
    const resized = planned.map((part) =>
      part.partNumber === 2 ? { ...part, byteSize: part.byteSize - 1 } : part
    );

    expect(hasEveryPart(byteSize, partSize, resized)).toBeFalsy();
  });

  it("refuses an extra part", () => {
    const extra = [...planned, { byteSize: 1, partNumber: 4 }];

    expect(hasEveryPart(byteSize, partSize, extra)).toBeFalsy();
  });
});
