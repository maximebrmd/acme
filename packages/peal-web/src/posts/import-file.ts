import { maxImportLength } from "peal-contract";

// The CSV file a member chose for an import, read in the browser as the
// command line reads one: as text, whole, and never parsed here. The
// server is the one reader of CSV, so the check and the import agree.

/** What the browser hands over of a chosen file. */
export interface ChosenFile {
  readonly size: number;
  readonly text: () => Promise<string>;
}

/** Why a file goes to no request: refused before it is sent. */
export type ImportFileRefusal = "empty" | "tooLong" | "unreadable";

export type ImportFile =
  | { readonly _tag: "read"; readonly csv: string }
  | { readonly _tag: "refused"; readonly reason: ImportFileRefusal };

// The mark some programs write before a file's first character.
const byteOrderMark = String.fromCodePoint(0xfe_ff);

const refused = (reason: ImportFileRefusal): ImportFile => ({
  _tag: "refused",
  reason,
});

/**
 * The file's text, without a leading byte order mark (`File.text()` reads
 * UTF-8). A file larger than an import's characters can take at four bytes
 * each is refused before it is read, as it may be of any size.
 */
export const readImportFile = async (file: ChosenFile): Promise<ImportFile> => {
  if (file.size > maxImportLength * 4) {
    return refused("tooLong");
  }

  let text = "";

  try {
    text = await file.text();
  } catch {
    return refused("unreadable");
  }

  const csv = text.startsWith(byteOrderMark)
    ? text.slice(byteOrderMark.length)
    : text;

  if (csv === "") {
    return refused("empty");
  }

  return csv.length > maxImportLength
    ? refused("tooLong")
    : { _tag: "read", csv };
};
