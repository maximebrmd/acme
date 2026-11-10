import { describe, expect, it } from "@effect/vitest";

import { PartBuffer } from "#media/infrastructure/part-buffer.ts";

const range = (from: number, length: number) =>
  Uint8Array.from({ length }, (_, index) => (from + index) % 256);

describe(PartBuffer, () => {
  it("cuts the bytes it is given into parts of one size, in order", () => {
    const buffer = new PartBuffer(4);

    buffer.push(range(0, 3));

    expect(buffer.hasPart).toBeFalsy();

    buffer.push(range(3, 7));

    expect(buffer.size).toBe(10);
    expect(buffer.hasPart).toBeTruthy();
    expect([
      [...buffer.takePart()],
      [...buffer.takePart()],
      buffer.hasPart,
      [...buffer.takeRest()],
      buffer.size,
      [...buffer.takeRest()],
    ]).toStrictEqual([[0, 1, 2, 3], [4, 5, 6, 7], false, [8, 9], 0, []]);
  });

  it("copies what it hands out, which the chunks it was given may outlive", () => {
    const buffer = new PartBuffer(2);
    const chunk = range(1, 3);

    buffer.push(chunk);

    const part = buffer.takePart();

    chunk.fill(0);

    expect([...part]).toStrictEqual([1, 2]);
  });
});
