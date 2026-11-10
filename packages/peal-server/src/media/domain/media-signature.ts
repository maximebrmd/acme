import { Option } from "effect";

import type { MediaContentType } from "./media-format.ts";

/**
 * How many of a file's first bytes tell its format, for the formats Peal
 * stores.
 */
export const signatureLength = 12;

const ascii = (bytes: Uint8Array, from: number, to: number): string =>
  String.fromCodePoint(...bytes.subarray(from, to));

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

const jpeg = [0xff, 0xd8, 0xff];

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// The brand of a QuickTime file, in the box that starts an ISO media file.
const quickTimeBrand = "qt  ";

// Brands of still and animated images in the same container (HEIF, AVIF),
// which no video player takes.
const imageBrands: ReadonlySet<string> = new Set([
  "avif",
  "avis",
  "heic",
  "heim",
  "heis",
  "heix",
  "hevc",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

/**
 * The accepted format a file's first bytes say it is, whatever its name or
 * the content type its host gives it: none for anything else. The probe
 * then reads the whole file, and rejects one that only starts like one.
 */
export const sniffContentType = (
  bytes: Uint8Array
): Option.Option<MediaContentType> => {
  if (startsWith(bytes, jpeg)) {
    return Option.some("image/jpeg");
  }

  if (startsWith(bytes, png)) {
    return Option.some("image/png");
  }

  const start = ascii(bytes, 0, 6);

  if (start === "GIF87a" || start === "GIF89a") {
    return Option.some("image/gif");
  }

  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return Option.some("image/webp");
  }

  if (ascii(bytes, 4, 8) !== "ftyp") {
    return Option.none();
  }

  const brand = ascii(bytes, 8, 12);

  if (imageBrands.has(brand)) {
    return Option.none();
  }

  return Option.some(
    brand === quickTimeBrand ? "video/quicktime" : "video/mp4"
  );
};
