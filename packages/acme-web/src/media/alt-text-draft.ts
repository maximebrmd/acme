/** Where saving an upload's description stands. */
export type AltTextSaving = "idle" | "saving" | "saved" | "failed";

/** The description field of an upload. */
export interface AltTextDraft {
  /** As typed. */
  readonly text: string;
  /** As the media holds it. */
  readonly saved: string;
  readonly saving: AltTextSaving;
}

/** Nothing written yet. */
export const emptyDraft: AltTextDraft = { saved: "", saving: "idle", text: "" };

/** Whether the field holds a change the media does not have yet. */
export const hasChange = (draft: AltTextDraft): boolean =>
  draft.text.trim() !== draft.saved.trim();

/**
 * The field once the media holds `sent`. What was typed while it was saved
 * stays, as a change the next save sends.
 */
export const savedAs = (draft: AltTextDraft, sent: string): AltTextDraft => {
  const next: AltTextDraft = { ...draft, saved: sent };

  return { ...next, saving: hasChange(next) ? "idle" : "saved" };
};

/** The field once saving failed: what was typed stays, to save again. */
export const saveFailed = (draft: AltTextDraft): AltTextDraft => ({
  ...draft,
  saving: "failed",
});

/**
 * A new upload of the file, which takes what was typed with it: the media
 * it makes holds it from the start.
 */
export const carriedOver = (draft: AltTextDraft): AltTextDraft => ({
  saved: draft.text,
  saving: "idle",
  text: draft.text,
});
