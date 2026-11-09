import type { SignedRequest, UploadTarget } from "peal-contract";
import { Option } from "effect";

/** One request of an upload, and the bytes of the file it sends. */
export interface FileSlice {
  readonly partNumber: number;
  /** The first byte it sends. */
  readonly start: number;
  /** One past the last byte it sends. */
  readonly end: number;
  readonly request: SignedRequest;
}

const slicesOfParts = (
  target: Extract<UploadTarget, { readonly _tag: "multipart" }>,
  byteSize: number
): Option.Option<readonly FileSlice[]> => {
  const parts = target.parts.toSorted(
    (left, right) => left.partNumber - right.partNumber
  );

  const slices = parts.map((part): FileSlice => ({
    end: (part.partNumber - 1) * target.partSize + part.byteSize,
    partNumber: part.partNumber,
    request: part.request,
    start: (part.partNumber - 1) * target.partSize,
  }));

  // Parts 1 to n, each the planned size but the last, which ends the file.
  const covers =
    slices.length > 0 &&
    slices.every(
      (slice, index) =>
        slice.partNumber === index + 1 &&
        slice.end > slice.start &&
        (index === slices.length - 1
          ? slice.end === byteSize && slice.end - slice.start <= target.partSize
          : slice.end - slice.start === target.partSize)
    );

  return covers ? Option.some(slices) : Option.none();
};

/**
 * The slices of a file of `byteSize` bytes that the server's plan sends:
 * the whole file in one request, or each part's bytes. None when the plan
 * does not cover the file exactly, which the store would refuse anyway.
 */
export const slicesOf = (
  target: UploadTarget,
  byteSize: number
): Option.Option<readonly FileSlice[]> =>
  target._tag === "single"
    ? Option.some([
        { end: byteSize, partNumber: 1, request: target.request, start: 0 },
      ])
    : slicesOfParts(target, byteSize);

/** How many parts of an upload go at once. */
export const partConcurrency = 4;

/**
 * How much of an upload has gone, from 0 to 1: the bytes each slice sent so
 * far, out of the file's.
 */
export const progressOf = (
  sent: ReadonlyMap<number, number>,
  byteSize: number
): number => {
  let total = 0;

  for (const bytes of sent.values()) {
    total += bytes;
  }

  return byteSize === 0 ? 1 : Math.min(1, total / byteSize);
};
