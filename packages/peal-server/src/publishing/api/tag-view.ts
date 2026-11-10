import type { Tag as TagView } from "peal-contract";

import type { Tag } from "#publishing/domain/tag.ts";

/** What clients see of a tag. */
export const tagView = ({ colour, createdAt, id, name }: Tag): TagView => ({
  colour,
  createdAt,
  id,
  name,
});
