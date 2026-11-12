import { describe, expect, it } from "@effect/vitest";
import { PostDraftSchema, PostToValidateSchema } from "peal-contract";
import type { PostDraft } from "peal-contract";

import {
  noPreview,
  previewOf,
  previewRequestOf,
  previewed,
} from "#posts/post-preview.ts";

// A draft with every field the composer may send.
const draft: Required<PostDraft> = {
  channelIds: ["00000000-0000-7000-8000-00000000c001"],
  channelSets: ["Launch"],
  content: {
    followUps: [
      { delaySeconds: 60, media: [], overrides: [], text: "Part two" },
    ],
    media: [
      {
        altText: "A synthetic chart",
        mediaId: "00000000-0000-7000-8000-0000000a0001",
      },
    ],
    overrides: [
      { channelId: "00000000-0000-7000-8000-00000000c001", text: "Own text" },
    ],
    text: "Launch day",
  },
  defaultSignatures: true,
  options: [],
  shortenLinks: true,
  signatureId: "00000000-0000-7000-8000-00000000b001",
  tagIds: ["00000000-0000-7000-8000-00000000d001"],
};

// What a draft's request holds that a check has no use for: the tags file
// the post, and change nothing it would be.
const notChecked = new Set(["tagIds"]);

// What a check takes that a draft never sends: a draft has no time, and a
// duplicate is a matter of its time.
const checkOnly = new Set(["allowDuplicate", "when"]);

describe(previewRequestOf, () => {
  it("sends every field a save sends, as it is, but the tags", () => {
    const { tagIds: _tags, ...checked } = draft;

    expect(previewRequestOf(draft)).toStrictEqual(checked);
  });

  it("covers every field of a draft, so a new one is not left out", () => {
    expect(
      Object.keys(PostDraftSchema.fields).filter((key) => !notChecked.has(key))
    ).toStrictEqual(
      Object.keys(PostToValidateSchema.fields).filter(
        (key) => !checkOnly.has(key)
      )
    );
    expect(Object.keys(draft).toSorted()).toStrictEqual(
      Object.keys(PostDraftSchema.fields).toSorted()
    );
  });
});

// An answer stands for any validation: the reducer never reads it.
const answer = (text: string) => ({ text });

describe(previewed, () => {
  it("keeps the last preview, dimmed, while a newer one is asked", () => {
    const shown = previewed(
      previewed(noPreview(), { _tag: "asked", key: "one", request: 1 }),
      { _tag: "answered", request: 1, value: answer("one") }
    );

    expect(
      previewed(shown, { _tag: "asked", key: "two", request: 2 })
    ).toStrictEqual({
      asked: "two",
      latest: 2,
      shown: answer("one"),
      status: "loading",
    });
  });

  it("drops an answer whose request is not the latest", () => {
    const asked = previewed(
      previewed(noPreview(), { _tag: "asked", key: "one", request: 1 }),
      { _tag: "asked", key: "two", request: 2 }
    );

    const late = previewed(asked, {
      _tag: "answered",
      request: 1,
      value: answer("stale"),
    });

    expect(late).toStrictEqual(asked);
    expect(
      previewed(late, { _tag: "answered", request: 2, value: answer("two") })
    ).toStrictEqual({
      asked: "two",
      latest: 2,
      shown: answer("two"),
      status: "shown",
    });
  });

  it("says the latest request failed, keeping the last preview", () => {
    const shown = previewed(
      previewed(noPreview(), { _tag: "asked", key: "one", request: 1 }),
      { _tag: "answered", request: 1, value: answer("one") }
    );

    const asked = previewed(shown, { _tag: "asked", key: "two", request: 2 });

    expect(
      previewed(asked, { _tag: "failed", forbidden: false, request: 2 })
    ).toStrictEqual({
      asked: "two",
      latest: 2,
      shown: answer("one"),
      status: "failed",
    });
    expect(
      previewed(asked, { _tag: "failed", forbidden: false, request: 1 })
    ).toStrictEqual(asked);
  });

  it("hides the previews from a member who may not read what they need", () => {
    const asked = previewed(noPreview(), {
      _tag: "asked",
      key: "one",
      request: 1,
    });

    expect(
      previewed(asked, { _tag: "failed", forbidden: true, request: 1 }).status
    ).toBe("forbidden");
  });
});

describe(previewOf, () => {
  const shown = previewed(
    previewed(noPreview(), { _tag: "asked", key: "one", request: 1 }),
    { _tag: "answered", request: 1, value: answer("one") }
  );

  it("dims the preview as soon as the post differs from the one asked", () => {
    expect(previewOf(shown, "two").status).toBe("loading");
  });

  it("shows it as it is while the post is the one asked, or none", () => {
    expect(previewOf(shown, "one")).toStrictEqual(shown);
    expect(previewOf(shown, undefined)).toStrictEqual(shown);
  });
});
