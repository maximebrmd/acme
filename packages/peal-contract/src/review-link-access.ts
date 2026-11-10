import { Schema } from "effect";

/**
 * What a review link lets whoever opens it do: see the post (`view`); see
 * it and comment (`comment`); see it, comment, and approve it or ask for
 * changes (`approve`).
 */
export const ReviewLinkAccessSchema = Schema.Literals([
  "view",
  "comment",
  "approve",
]).annotate({ identifier: "ReviewLinkAccess" });

export type ReviewLinkAccess = typeof ReviewLinkAccessSchema.Type;
