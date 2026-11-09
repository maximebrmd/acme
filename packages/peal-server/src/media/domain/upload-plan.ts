import { Schema } from "effect";

import type { ByteSize } from "./media-format.ts";

const mebibyte = 1024 * 1024;

/**
 * The multipart rules every S3-compatible store keeps: parts of at least
 * 5 MiB except the last, at most 10,000 of them. Cloudflare R2 also wants
 * every part but the last to have the same size, which a plan always does.
 */
export const minPartSize = 5 * mebibyte;

export const maxPartCount = 10_000;

/** The size of every part of a multipart upload but the last. */
export const PartSizeSchema = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(minPartSize)
);

export type PartSize = typeof PartSizeSchema.Type;

/** A part's position in a multipart upload, from 1. */
export const PartNumberSchema = Schema.Int.check(
  Schema.isBetween({ maximum: maxPartCount, minimum: 1 })
);

export type PartNumber = typeof PartNumberSchema.Type;

/** How files are split for upload. */
export interface UploadSizing {
  /** Files larger than this are uploaded in parts. */
  readonly multipartThreshold: number;
  /** The size of each part but the last. */
  readonly partSize: number;
}

/**
 * How a file travels to storage: in one request, or in parts the client
 * sends separately and can retry one by one.
 */
export type UploadPlan =
  | { readonly _tag: "single" }
  | {
      readonly _tag: "multipart";
      readonly partCount: number;
      readonly partSize: PartSize;
    };

/** The plan for a file of `byteSize` bytes. */
export const planUpload = (
  byteSize: ByteSize,
  sizing: UploadSizing
): UploadPlan => {
  if (byteSize <= sizing.multipartThreshold) {
    return { _tag: "single" };
  }

  // Parts grow, in whole mebibytes, when the file would need more than the
  // stores allow.
  const fewestPartsSize =
    Math.ceil(byteSize / maxPartCount / mebibyte) * mebibyte;

  const partSize = Math.max(minPartSize, sizing.partSize, fewestPartsSize);

  return {
    _tag: "multipart",
    partCount: Math.ceil(byteSize / partSize),
    partSize,
  };
};

/** A part to upload, and its exact size. */
export interface PlannedPart {
  readonly byteSize: ByteSize;
  readonly partNumber: PartNumber;
}

/** Every part of a file split into parts of `partSize` bytes, in order. */
export const plannedParts = (
  byteSize: ByteSize,
  partSize: PartSize
): readonly PlannedPart[] =>
  Array.from({ length: Math.ceil(byteSize / partSize) }, (_, index) => ({
    byteSize: Math.min(partSize, byteSize - index * partSize),
    partNumber: index + 1,
  }));

/**
 * Whether the parts received are exactly the planned ones, each with its
 * planned size, in order.
 */
export const hasEveryPart = (
  byteSize: ByteSize,
  partSize: PartSize,
  received: readonly PlannedPart[]
): boolean => {
  const planned = plannedParts(byteSize, partSize);

  return (
    received.length === planned.length &&
    planned.every(
      (part, index) =>
        received[index]?.partNumber === part.partNumber &&
        received[index]?.byteSize === part.byteSize
    )
  );
};
