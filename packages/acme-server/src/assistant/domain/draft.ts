import { Result, Schema } from "effect";

import { DraftRejected } from "./draft-rejected.ts";

/**
 * The longest text the assistant takes, in UTF-16 code units as JavaScript
 * counts them: a long LinkedIn post, with room to spare. It bounds what each
 * request costs.
 */
export const maxDraftLength = 5000;

/**
 * A post's text, as its author wrote it, for the assistant to work on: not
 * blank, and at most `maxDraftLength` long. It is data to the model, never
 * instructions.
 */
export const DraftSchema = Schema.String.check(
  Schema.isMaxLength(maxDraftLength),
  Schema.makeFilter((text: string) => text.trim() !== "", {
    expected: "a text that is not blank",
  })
).pipe(Schema.brand("Draft"));

export type Draft = typeof DraftSchema.Type;

/** The text as a draft, or why the assistant cannot take it. */
export const checkDraft = (
  text: string
): Result.Result<Draft, DraftRejected> => {
  if (text.trim() === "") {
    return Result.fail(
      new DraftRejected({ maxLength: maxDraftLength, reason: "empty" })
    );
  }

  return text.length > maxDraftLength
    ? Result.fail(
        new DraftRejected({ maxLength: maxDraftLength, reason: "tooLong" })
      )
    : Result.succeed(DraftSchema.make(text));
};
