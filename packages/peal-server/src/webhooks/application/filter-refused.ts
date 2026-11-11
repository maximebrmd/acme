import { Schema } from "effect";

/**
 * A filter the endpoint cannot take: a list of workspaces on one of the
 * `workspace` scope, which hears its own only, or a list that is not one
 * of ids, or too long. Nothing was saved.
 */
export class FilterRefused extends Schema.TaggedError<FilterRefused>()(
  "FilterRefused",
  { field: Schema.Literals(["channelIds", "workspaceIds"]) }
) {}
