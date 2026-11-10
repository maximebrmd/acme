import { Schema } from "effect";

/**
 * Why a comment is not taken: its text is empty once cleaned, or too long
 * (`text`); so is the name given (`name`); it answers a comment that started no thread of the post
 * (`parent`); it is about a channel the post does not go to, or it is an
 * answer, which has no anchor (`anchor`); or the words it quotes are not in
 * the text where it says (`selection`).
 */
export const CommentProblemSchema = Schema.Literals([
  "text",
  "name",
  "parent",
  "anchor",
  "selection",
]).annotate({ identifier: "CommentProblem" });

export type CommentProblem = typeof CommentProblemSchema.Type;

/** A comment that cannot be kept as it was sent. */
export class CommentInvalid extends Schema.TaggedError<CommentInvalid>()(
  "CommentInvalid",
  { problem: CommentProblemSchema },
  {
    description:
      "The comment cannot be kept as it was sent. `problem` names what is wrong with it.",
    httpApiStatus: 422,
  }
) {}
