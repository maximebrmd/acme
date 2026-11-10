import { Schema } from "effect";

/**
 * The workspace's name or external id is empty, too long, or holds
 * characters nobody could read.
 */
export class InvalidWorkspaceDetails extends Schema.TaggedError<InvalidWorkspaceDetails>()(
  "InvalidWorkspaceDetails",
  { field: Schema.Literals(["name", "externalId"]) }
) {}
