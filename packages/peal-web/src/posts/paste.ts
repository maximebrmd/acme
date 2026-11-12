/** What a paste holds, as the composer's text fields read it. */
export type Paste<F> =
  | { readonly _tag: "files"; readonly files: readonly F[] }
  | { readonly _tag: "text" };

/** The clipboard of a paste, as the browser hands it over. */
interface Clipboard<F> {
  readonly files: Iterable<F>;
  readonly getData: (format: string) => string;
}

/**
 * Whether a paste brings files, which the composer uploads and attaches as
 * a drop would, or is the editor's. Files are taken only when they come
 * alone: a clipboard that also holds text or markup, as a spreadsheet's
 * cells come with a picture of them, is pasted as text.
 */
export const pasteOf = <F>(clipboard: Clipboard<F> | null): Paste<F> => {
  const files = [...(clipboard?.files ?? [])];

  const written =
    clipboard !== null &&
    (clipboard.getData("text/plain") !== "" ||
      clipboard.getData("text/html") !== "");

  return files.length === 0 || written
    ? { _tag: "text" }
    : { _tag: "files", files };
};
