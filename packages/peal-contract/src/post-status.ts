import { Schema } from "effect";

/**
 * Where a post is in its life: a `draft`, `awaitingApproval` (asked to go
 * out at a time, and waiting for someone to approve it, in a workspace that
 * asks for approvals), `scheduled` for a time, `publishing` on its channels,
 * `finished` (its `outcome` tells how), or `cancelled`.
 */
export const PostStatusSchema = Schema.Literals([
  "draft",
  "awaitingApproval",
  "scheduled",
  "publishing",
  "finished",
  "cancelled",
]).annotate({ identifier: "PostStatus" });

export type PostStatus = typeof PostStatusSchema.Type;
