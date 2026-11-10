import { Schema } from "effect";

/**
 * The `before` of a list of a partner's workspaces is not what a page
 * gave as its `next`.
 */
export class InvalidWorkspaceCursor extends Schema.TaggedError<InvalidWorkspaceCursor>()(
  "InvalidWorkspaceCursor",
  {}
) {}
