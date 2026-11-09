import { Schema } from "effect";

/**
 * Where a post is on one channel. `unconfirmed` means Peal could not tell
 * whether the platform published it: the user checks before reposting.
 */
export const PostTargetStatusSchema = Schema.Literals([
  "pending",
  "publishing",
  "published",
  "failed",
  "unconfirmed",
  "cancelled",
]).annotate({ identifier: "PostTargetStatus" });

export type PostTargetStatus = typeof PostTargetStatusSchema.Type;
