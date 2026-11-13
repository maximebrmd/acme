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

/**
 * A file's name as a client gave it, made storable and safe to show: the
 * last segment of whatever path came with it (a client may send its
 * folders, which are not the file's), on one line, without control
 * characters or the marks that reorder text, at most `maxFileNameLength`
 * characters. None when nothing is left.
 */
export const fileNameOf = (raw: string): Option.Option<FileName> => {
  const segment = raw.split(/[/\\]/u).at(-1) ?? "";
  const name = storableLine(segment, maxFileNameLength);

  return name === "" ? Option.none() : Option.some(FileNameSchema.make(name));
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

/**
 * The name of the file an address points at: the last segment of its
 * path, decoded, as `fileNameOf` keeps it. None for an address whose path
 * ends with a slash, or that is not one.
 */
export const nameInAddress = (url: string): Option.Option<FileName> => {
  if (!URL.canParse(url)) {
    return Option.none();
  }

  const segment = new URL(url).pathname.split("/").at(-1) ?? "";

  return fileNameOf(decoded(segment));
};
