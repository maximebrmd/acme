import { Schema } from "effect";

/**
 * The most text a post keeps, in UTF-16 code units: far above what any
 * platform publishes, it only bounds what a draft stores. Each platform's own
 * limit is checked when the post is scheduled.
 */
export const maxPostTextLength = 65_536;

const nul = String.fromCodePoint(0);

/**
 * Postgres keeps no NUL character in a text or a JSON string, and no
 * platform publishes one: text that holds one is refused as it comes in,
 * rather than failing when it is saved.
 */
export const isWithoutNul = Schema.makeFilter(
  (text: string) => !text.includes(nul),
  { expected: "text without NUL characters" }
);

/** A post's text, as the user wrote it: plain text, mentions and all. */
export const PostTextSchema = Schema.String.check(
  Schema.isMaxLength(maxPostTextLength),
  isWithoutNul
);

export type PostText = typeof PostTextSchema.Type;
