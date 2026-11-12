/** What a paste holds, as the composer's text fields read it. */
export type Paste<F> =
  | { readonly _tag: "files"; readonly files: readonly F[] }
  | { readonly _tag: "text" };

/**
 * Whether a paste brings files, which the composer uploads and attaches as
 * a drop would, or is text for the editor. A clipboard with both, as some
 * image editors fill it (the picture and its name), brings the files: its
 * text is not pasted.
 */
export const pasteOf = <F>(
  clipboard: { readonly files: ArrayLike<F> } | null
): Paste<F> => {
  const files = [...(clipboard?.files ?? [])];

  return files.length === 0 ? { _tag: "text" } : { _tag: "files", files };
};
