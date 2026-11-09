import { Schema } from "effect";

/**
 * The most text a post keeps, in UTF-16 code units: far above what any
 * platform publishes, it only bounds what a draft stores. Each platform's own
 * limit is checked when the post is scheduled.
 */
export const maxPostTextLength = 65_536;

/** A post's text, as the user wrote it: plain text, mentions and all. */
export const PostTextSchema = Schema.String.check(
  Schema.isMaxLength(maxPostTextLength)
);

export type PostText = typeof PostTextSchema.Type;
