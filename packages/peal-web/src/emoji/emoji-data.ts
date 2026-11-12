/** The files of a language the emoji picker reads, as emojibase-data names them. */
export const emojiFiles = ["data.json", "messages.json"] as const;

/**
 * Where the web app serves the emoji picker's data: one folder per
 * language, holding `emojiFiles` (`src/app/emoji-data`).
 */
export const emojiDataPath = "/emoji-data";

/**
 * Emojibase's groups, by their index in its data: the picker's categories,
 * which the catalogues name (`Posts.Composer.emoji.category`).
 */
const categoryGroups = [
  "smileysEmotion",
  "peopleBody",
  "component",
  "animalsNature",
  "foodDrink",
  "travelPlaces",
  "activities",
  "objects",
  "symbols",
  "flags",
] as const;

export type CategoryGroup = (typeof categoryGroups)[number];

/**
 * The data with each category labelled by its group, which the picker's
 * header then names in the reader's language; a group this list does not
 * know keeps the data's own label.
 */
export const withCategoryGroups = <
  D extends {
    readonly categories: readonly { readonly index: number; label: string }[];
  },
>(
  data: D
): D => ({
  ...data,
  categories: data.categories.map((category) => ({
    ...category,
    label: categoryGroups[category.index] ?? category.label,
  })),
});

/** The group a category's label names, if it is one. */
export const categoryGroupOf = (label: string): CategoryGroup | undefined =>
  categoryGroups.find((group) => group === label);
