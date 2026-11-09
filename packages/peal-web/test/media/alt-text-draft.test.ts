import { describe, expect, it } from "@effect/vitest";

import {
  carriedOver,
  emptyDraft,
  hasChange,
  savedAs,
  saveFailed,
} from "#media/alt-text-draft.ts";
import type { AltTextDraft } from "#media/alt-text-draft.ts";

const typed = (text: string): AltTextDraft => ({ ...emptyDraft, text });

describe(hasChange, () => {
  it("ignores spaces around what was saved", () => {
    expect(hasChange({ ...typed(" A cat "), saved: "A cat" })).toBeFalsy();
    expect(hasChange(typed("A cat"))).toBeTruthy();
    expect(hasChange(typed("   "))).toBeFalsy();
  });
});

describe(savedAs, () => {
  it("marks the field saved once the media holds what it shows", () => {
    expect(
      savedAs({ ...typed("A cat"), saving: "saving" }, "A cat")
    ).toStrictEqual({
      saved: "A cat",
      saving: "saved",
      text: "A cat",
    });
  });

  it("keeps what was typed while the save ran, as a change to send", () => {
    const meanwhile: AltTextDraft = {
      saved: "",
      saving: "saving",
      text: "A cat on a mat",
    };

    const next = savedAs(meanwhile, "A cat");

    expect(next).toStrictEqual({
      saved: "A cat",
      saving: "idle",
      text: "A cat on a mat",
    });
    expect(hasChange(next)).toBeTruthy();
  });
});

describe(saveFailed, () => {
  it("keeps what was typed, to save again", () => {
    const meanwhile: AltTextDraft = {
      saved: "A dog",
      saving: "saving",
      text: "A cat on a mat",
    };

    expect(saveFailed(meanwhile)).toStrictEqual({
      saved: "A dog",
      saving: "failed",
      text: "A cat on a mat",
    });
  });
});

describe(carriedOver, () => {
  it("counts what was typed as held by the new upload's media", () => {
    const next = carriedOver({ saved: "", saving: "failed", text: "A cat" });

    expect(next).toStrictEqual({
      saved: "A cat",
      saving: "idle",
      text: "A cat",
    });
    expect(hasChange(next)).toBeFalsy();
  });
});
