import { Schema } from "effect";
import type { DateTime, Option } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { TagIdSchema } from "./tag-id.ts";
import type { TagId } from "./tag-id.ts";

/**
 * The colours a tag takes: names of the theme's palette, which each client
 * draws with its own tokens, in light and dark. Never a CSS value: a tag
 * is written by one member and shown to all.
 */
export const TagColourSchema = Schema.Literals([
  "gray",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
]);

export type TagColour = typeof TagColourSchema.Type;

/** The longest name a tag has. */
export const maxTagNameLength = 40;

/** The most tags a workspace keeps. */
export const maxTagsPerWorkspace = 100;

/** The most tags one post has. */
export const maxTagsPerPost = 10;

const hasNoControlCharacter = Schema.makeFilter(
  (name: string) => !/\p{Cc}/u.test(name),
  { expected: "a name on one line, without control characters" }
);

const isTrimmed = Schema.makeFilter((name: string) => name === name.trim(), {
  expected: "a name without spaces around it",
});

/** A tag's name: a short line, as its member wrote it. */
export const TagNameSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxTagNameLength),
  isTrimmed,
  hasNoControlCharacter
);

/** The tags a post has: each once, `maxTagsPerPost` at most. */
export const PostTagIdsSchema = Schema.Array(TagIdSchema).check(
  Schema.isMaxLength(maxTagsPerPost),
  Schema.makeFilter(
    (tagIds: readonly string[]) => new Set(tagIds).size === tagIds.length,
    { expected: "each tag once" }
  )
);

/**
 * A label a workspace puts on its posts to find them again: a campaign, a
 * theme, a client. Workspace content, naming nobody.
 */
export class Tag extends Schema.Class<Tag>("peal-server/publishing/domain/Tag")(
  {
    colour: TagColourSchema,
    createdAt: Schema.DateTimeUtc,
    id: TagIdSchema,
    name: TagNameSchema,
    workspaceId: WorkspaceIdSchema,
  }
) {}

/** What a member writes of a tag. */
export interface TagDetails {
  readonly colour: TagColour;
  readonly name: string;
}

const decodeName = Schema.decodeUnknownOption(TagNameSchema);

/** The name as tags keep it, or none when it cannot be one. */
export const tagNameOf = (raw: string): Option.Option<string> =>
  decodeName(raw.normalize("NFC").trim());

/**
 * What two names are compared by: a workspace has one tag per name,
 * whatever its case.
 */
export const tagKeyOf = (name: string): string =>
  name.normalize("NFC").toLowerCase();

export const createTag = (
  id: TagId,
  workspaceId: WorkspaceId,
  { colour, name }: TagDetails,
  now: DateTime.Utc
): Tag => new Tag({ colour, createdAt: now, id, name, workspaceId });

/** The tag with a new name or colour. */
export const editTag = (tag: Tag, { colour, name }: TagDetails): Tag =>
  new Tag({
    colour,
    createdAt: tag.createdAt,
    id: tag.id,
    name,
    workspaceId: tag.workspaceId,
  });
