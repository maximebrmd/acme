import { Option, Schema } from "effect";

import { storableLine } from "#shared/domain/platform-text.ts";

/**
 * The most characters Peal keeps of a file's name: what most file systems
 * allow, so no name a device gives is cut.
 */
export const maxFileNameLength = 255;

/**
 * What a file was called on the member's device, or at the address it was
 * imported from: the member's own text, to find the file by and to show,
 * never a path. Never empty, on one line, at most `maxFileNameLength`
 * characters, as `fileNameOf` makes it.
 */
export const FileNameSchema = Schema.Trimmed.check(Schema.isNonEmpty()).pipe(
  Schema.brand("FileName")
);

export type FileName = typeof FileNameSchema.Type;

// Characters that show nothing: zero-width spaces and joiners, the word
// joiner, the byte order mark and the tag characters, which can carry text
// a model reads and a person never sees. A name keeps none of them.
const isInvisible = (code: number): boolean =>
  (code >= 0x20_0b && code <= 0x20_0d) ||
  code === 0x20_60 ||
  code === 0xfe_ff ||
  (code >= 0xe_00_00 && code <= 0xe_00_7f);

const visible = (text: string): string =>
  Array.from(text, (character) =>
    isInvisible(character.codePointAt(0) ?? 0) ? "" : character
  ).join("");

const decodeName = Schema.decodeUnknownOption(FileNameSchema);

/**
 * A file's name as a client gave it, made storable and safe to show: the
 * last segment of whatever path came with it (a client may send its
 * folders, which are not the file's), composed (NFC, as keyboards type
 * text, so a search finds it), on one line, without control characters,
 * the marks that reorder text or the characters that show nothing, at
 * most `maxFileNameLength` characters. None when nothing is left: outside
 * text never makes this fail.
 */
export const fileNameOf = (raw: string): Option.Option<FileName> => {
  const segment = raw.split(/[/\\]/u).at(-1) ?? "";

  return decodeName(
    storableLine(
      visible(segment.toWellFormed().normalize("NFC")),
      maxFileNameLength
    )
  );
};

// The segment as its percent-encoding says, or as written when that is
// not one (a lone `%`).
const decoded = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

// A file's name ends with an extension: a segment without one is a page
// or a share link's token, not a name.
const extension = /\.[\p{L}\p{N}]{1,5}$/u;

// What a share link's secret looks like: 20 characters or more of one
// unbroken run, upper and lower case letters and digits mixed, or of
// hexadecimal digits. A name of words, dates and separators is not one.
const looksLikeToken = (base: string): boolean =>
  base.length >= 20 &&
  /^[\w-]+$/u.test(base) &&
  ((/[a-z]/u.test(base) && /[A-Z]/u.test(base) && /\d/u.test(base)) ||
    /^[\da-f]+$/iu.test(base));

/**
 * The name of the file an address points at: the last segment of its
 * path, decoded, as `fileNameOf` keeps it, never its query. None for an
 * address that is not one, whose path ends with a slash, whose last
 * segment has no extension, or looks like a token (an address that holds
 * one is a secret, and its segment no file's name).
 */
export const nameInAddress = (url: string): Option.Option<FileName> => {
  if (!URL.canParse(url)) {
    return Option.none();
  }

  const segment = decoded(new URL(url).pathname.split("/").at(-1) ?? "");
  const name = segment.split(/[/\\]/u).at(-1) ?? "";
  const base = name.replace(extension, "");

  return base === name || looksLikeToken(base)
    ? Option.none()
    : fileNameOf(name);
};
