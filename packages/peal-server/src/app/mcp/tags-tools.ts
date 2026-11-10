import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  CurrentMember,
  maxTagNameLength,
  maxTagsPerPost,
  maxTagsPerWorkspace,
  PostSchema,
  PostTagIdsSchema,
  TagColourSchema,
  TagNameSchema,
  TagSchema,
} from "peal-contract";

import { changing, reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

const tagId = Schema.String.annotate({
  description: "The tag's id, as list_tags answers it.",
});

const name = TagNameSchema.annotate({
  description: `The tag's name: ${String(maxTagNameLength)} characters at most, on one line, without spaces around it, which no other tag of the workspace has, whatever its case.`,
});

const colour = TagColourSchema.annotate({
  description:
    "The tag's colour, a name of the palette the web app draws: it says nothing else.",
});

const saysNothingOutside =
  "Tags are the workspace's own labels: they say nothing to the platforms, and nothing of a tag goes out with a post.";

export const ListTags = Tool.make("list_tags", {
  dependencies: [CurrentMember],
  description: `Lists the workspace's tags, oldest first: the labels it files its posts under, each with its id, its name and its colour. A post names its tags by id (\`tagIds\`), and list_posts takes a \`tagId\` to list a tag's posts. ${saysNothingOutside}`,
  failure: ToolRefused,
  success: Schema.Struct({ tags: Schema.Array(TagSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List tags");

export const CreateTag = Tool.make("create_tag", {
  dependencies: [CurrentMember],
  description: `Adds a tag to the workspace, for every member to file posts under: a name and a colour. No post has it until tag_post, create_draft, update_draft or create_post gives it one. A workspace keeps ${String(maxTagsPerWorkspace)} tags at most, and a name another tag has, whatever its case, is refused: read list_tags first, and use the tag that exists. ${saysNothingOutside}`,
  failure: ToolRefused,
  parameters: Schema.Struct({ colour, name }),
  success: TagSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: false })
  )
  .annotate(Tool.Title, "Create a tag");

export const UpdateTag = Tool.make("update_tag", {
  dependencies: [CurrentMember],
  description:
    "Gives a tag of the workspace another name, another colour or both, replacing those it had, for every member: what is left out stays as it is. Its posts keep it, under its new name. A name another tag has, whatever its case, is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    colour: Schema.optionalKey(colour),
    name: Schema.optionalKey(name),
    tagId,
  }),
  success: TagSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Update a tag");

export const DeleteTag = Tool.make("delete_tag", {
  dependencies: [CurrentMember],
  description:
    "Deletes a tag of the workspace for good, and takes it off every post that had it: the posts stay, as they are, without it. It cannot be brought back, nor can which posts had it: do it only when the user asked for this tag to be deleted.",
  failure: ToolRefused,
  parameters: Schema.Struct({ tagId }),
  success: Schema.Struct({ deleted: Schema.String }),
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Delete a tag");

export const TagPost = Tool.make("tag_post", {
  dependencies: [CurrentMember],
  description: `Sets the tags a post of the workspace is filed under: those given, ${String(maxTagsPerPost)} at most, instead of those it had, and \`[]\` takes them all off. To add one, read the post's \`tagIds\` with get_post and send them back with the new one. Nothing else of the post changes, and a post takes tags whatever its status, sent or not. ${saysNothingOutside}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    postId: Schema.String.annotate({
      description: "The post's id, as list_posts or get_post answer it.",
    }),
    tagIds: PostTagIdsSchema.annotate({
      description:
        "The tags the post is filed under from now on, as list_tags answers their ids, each once.",
    }),
  }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Set a post's tags");

/** The tools that read and change a workspace's tags, and tag its posts. */
export const TagTools = Toolkit.make(
  ListTags,
  CreateTag,
  UpdateTag,
  DeleteTag,
  TagPost
);
