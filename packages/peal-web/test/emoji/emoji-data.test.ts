import { describe, expect, it } from "@effect/vitest";

import { categoryGroupOf, withCategoryGroups } from "#emoji/emoji-data.ts";

describe(withCategoryGroups, () => {
  it("names each category by its emojibase group, for the catalogues", () => {
    expect(
      withCategoryGroups({
        categories: [
          { index: 0, label: "smileys et émotions" },
          { index: 9, label: "drapeaux" },
        ],
        emojis: [],
      })
    ).toStrictEqual({
      categories: [
        { index: 0, label: "smileysEmotion" },
        { index: 9, label: "flags" },
      ],
      emojis: [],
    });
  });

  it("keeps the data's label for a group it does not know", () => {
    expect(
      withCategoryGroups({ categories: [{ index: 42, label: "new" }] })
    ).toStrictEqual({ categories: [{ index: 42, label: "new" }] });
  });
});

describe(categoryGroupOf, () => {
  it("reads back a group's name, and nothing from another label", () => {
    expect(categoryGroupOf("travelPlaces")).toBe("travelPlaces");
    expect(categoryGroupOf("new")).toBeUndefined();
  });
});
