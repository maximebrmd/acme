import { Schema } from "effect";

/**
 * A tool could not do what it was asked, for a reason the user can act on.
 * The MCP client gets `message` as the tool's error.
 */
export class ToolRefused extends Schema.TaggedError<ToolRefused>()(
  "ToolRefused",
  { message: Schema.String }
) {}
