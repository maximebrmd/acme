import { Schema } from "effect";

/**
 * Where a post is in its life: a `draft`, `scheduled` for a time,
 * `publishing` on its channels, `finished` (its `outcome` tells how), or
 * `cancelled`.
 */
export const PostStatusSchema = Schema.Literals([
  "draft",
  "scheduled",
  "publishing",
  "finished",
  "cancelled",
]).annotate({ identifier: "PostStatus" });

export type PostStatus = typeof PostStatusSchema.Type;
