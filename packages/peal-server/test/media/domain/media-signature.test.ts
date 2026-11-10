import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { sniffContentType } from "#media/domain/media-signature.ts";

const bytes = (...values: readonly number[]) => Uint8Array.from(values);

const text = (value: string) => new TextEncoder().encode(value);

// A file's first bytes, as an ISO media file starts: a box size, "ftyp",
// then its brand.
const isoMedia = (brand: string) =>
  Uint8Array.from([0, 0, 0, 0x20, ...text(`ftyp${brand}`), 0, 0, 0, 0]);

describe(sniffContentType, () => {
  it.each([
    ["image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46)],
    ["image/png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)],
    ["image/gif", text("GIF89a\u0001\u0000\u0001\u0000")],
    ["image/gif", text("GIF87a\u0001\u0000\u0001\u0000")],
    ["image/webp", text("RIFF\u0010\u0000\u0000\u0000WEBPVP8 ")],
    ["video/mp4", isoMedia("isom")],
    ["video/mp4", isoMedia("mp42")],
    ["video/quicktime", isoMedia("qt  ")],
  ] as const)("reads %s from a file's first bytes", (contentType, start) => {
    expect(sniffContentType(start)).toStrictEqual(Option.some(contentType));
  });

  it.each([
    ["an empty file", bytes()],
    ["a page", text("<!doctype html><html><head>")],
    ["an SVG", text('<svg xmlns="http://www.w3.org/2000/svg">')],
    ["a PDF", text("%PDF-1.7\n%âãÏÓ\n")],
    ["a sound in a RIFF file", text("RIFF\u0010\u0000\u0000\u0000WAVEfmt ")],
    ["a HEIC image", isoMedia("heic")],
    ["an AVIF image", isoMedia("avif")],
    ["a file cut short", bytes(0xff, 0xd8)],
  ] as const)("takes %s for nothing Peal stores", (_name, start) => {
    expect(sniffContentType(start)).toStrictEqual(Option.none());
  });
});
