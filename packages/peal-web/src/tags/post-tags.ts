import { Schema } from "effect";
import type { Option } from "effect";
import { maxTagsPerPost, TagDetailsSchema } from "peal-contract";
import type { Tag, TagColour, TagDetails } from "peal-contract";

// What a post's tags are, among the workspace's, and how a member changes
// them.

/**
 * The post's tags, in the workspace's order. An id the workspace no longer
 * has, as a tag deleted meanwhile, names nothing.
 */
export const tagsOf = (
  tagIds: readonly string[],
  tags: readonly Tag[]
): readonly Tag[] => tags.filter(({ id }) => tagIds.includes(id));

/** Whether a post with these tags may take one more. */
export const hasRoomForTag = (tagIds: readonly string[]): boolean =>
  tagIds.length < maxTagsPerPost;

/**
 * The tags with one added or taken off, in the workspace's order, without
 * those the workspace no longer has. Adding one to a post that is full
 * changes nothing.
 */
export const withTag = (
  tagIds: readonly string[],
  tags: readonly Tag[],
  tagId: string,
  chosen: boolean
): readonly string[] => {
  const known = tagsOf(tagIds, tags).map(({ id }) => id);

  if (chosen && !known.includes(tagId) && !hasRoomForTag(known)) {
    return known;
  }

  return tags.flatMap(({ id }) => {
    const kept = id === tagId ? chosen : known.includes(id);

    return kept ? [id] : [];
  });
};

/** A tag as a form holds it. */
export interface TagDraft {
  readonly colour: TagColour;
  readonly name: string;
}

export const emptyTagDraft: TagDraft = { colour: "gray", name: "" };

const decodeDetails = Schema.decodeUnknownOption(TagDetailsSchema);

/** What the form would save, if the API would take it. */
export const tagDetailsOf = (draft: TagDraft): Option.Option<TagDetails> =>
  decodeDetails({ colour: draft.colour, name: draft.name.trim() });
