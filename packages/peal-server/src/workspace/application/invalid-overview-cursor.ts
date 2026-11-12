import { Schema } from "effect";

/**
 * The cursor of a page across workspaces is not one a page of the same
 * list gave as its `next`.
 */
export class InvalidOverviewCursor extends Schema.TaggedError<InvalidOverviewCursor>()(
  "InvalidOverviewCursor",
  {}
) {}
