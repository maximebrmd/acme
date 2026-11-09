import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * A post of the workspace is going out: its posts cannot be erased until it
 * has finished, as its job would find them gone halfway.
 */
export class PostsPublishing extends Schema.TaggedError<PostsPublishing>()(
  "PostsPublishing",
  { workspaceId: WorkspaceIdSchema }
) {}
