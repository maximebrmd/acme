import { Schema } from "effect";

/**
 * Why a comment is not taken: its text is empty or too long (`text`); the
 * name given is (`name`); it
 * answers a comment that started no thread of the post (`parent`); it is
 * about a channel the post does not go to, or it is an answer, which has no
 * anchor (`anchor`); or the words it quotes are not in the text where it
 * says (`selection`).
 */
export const CommentProblemSchema = Schema.Literals([
  "text",
  "name",
  "parent",
  "anchor",
  "selection",
]);

export type CommentProblem = typeof CommentProblemSchema.Type;

/** A comment that cannot be kept as it was sent. */
export class CommentRejected extends Schema.TaggedError<CommentRejected>()(
  "CommentRejected",
  { problem: CommentProblemSchema }
) {}
