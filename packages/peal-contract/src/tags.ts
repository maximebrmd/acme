import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { TagNameTaken } from "./tag-name-taken.ts";
import { TagNotFound } from "./tag-not-found.ts";
import { TooManyTags } from "./too-many-tags.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** The longest name a tag has. */
export const maxTagNameLength = 40;

/** The most tags a workspace keeps. */
export const maxTagsPerWorkspace = 100;

/** The most tags one post has. */
export const maxTagsPerPost = 10;

/**
 * The colours a tag takes: names of a palette each client draws with its
 * own theme, never a CSS value.
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
]).annotate({ identifier: "TagColour" });

export type TagColour = typeof TagColourSchema.Type;

/** A tag's name: one line, without spaces around it. */
export const TagNameSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxTagNameLength),
  Schema.makeFilter((name: string) => name === name.trim(), {
    expected: "a name without spaces around it",
  }),
  Schema.makeFilter((name: string) => !/\p{Cc}/u.test(name), {
    expected: "a name on one line, without control characters",
  })
);

/** A label a workspace files its posts under. */
export const TagSchema = Schema.Struct({
  colour: TagColourSchema,
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "Tag" });

export type Tag = typeof TagSchema.Type;

/** A tag's name and colour, as a member writes them. */
export const TagDetailsSchema = Schema.Struct({
  colour: TagColourSchema,
  name: TagNameSchema,
}).annotate({ identifier: "TagDetails" });

export type TagDetails = typeof TagDetailsSchema.Type;

/** The tags a post is filed under: each once, ten at most. */
export const PostTagIdsSchema = Schema.Array(Schema.String).check(
  Schema.isMaxLength(maxTagsPerPost),
  Schema.makeFilter(
    (tagIds: readonly string[]) => new Set(tagIds).size === tagIds.length,
    { expected: "each tag once" }
  )
);

const workspace = { workspaceId: Schema.String };

const tag = { ...workspace, tagId: Schema.String };

/** A workspace's tags: the labels it files its posts under. */
export class TagsApi extends HttpApiGroup.make("tags")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(TagSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's tags, oldest first. A post names its tags by id (`tagIds`). Needs post:read.",
        summary: "List tags",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [Forbidden, TagNameTaken, TooManyTags],
      params: workspace,
      payload: TagDetailsSchema,
      success: TagSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Adds a tag to the workspace: a name of ${maxTagNameLength} characters at most, on one line, which no other tag of the workspace has whatever its case, and a colour of the palette. A workspace keeps ${maxTagsPerWorkspace} tags at most. Needs post:update.`,
        summary: "Create a tag",
      })
    ),
    HttpApiEndpoint.patch("update", "/:tagId", {
      error: [Forbidden, TagNotFound, TagNameTaken],
      params: tag,
      payload: TagDetailsSchema,
      success: TagSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Gives a tag another name or colour. Its posts keep it. Needs post:update.",
        summary: "Update a tag",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:tagId", {
      error: [Forbidden, TagNotFound],
      params: tag,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes a tag, and takes it off every post that had it; the posts stay. Needs post:update.",
        summary: "Delete a tag",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/tags") {}
