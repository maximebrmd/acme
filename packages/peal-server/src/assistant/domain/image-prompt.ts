import { Result, Schema } from "effect";

import { DraftRejected } from "./draft-rejected.ts";

/**
 * The longest description of an image the assistant takes, in UTF-16 code
 * units: a few sentences, which is what an image model reads.
 */
export const maxImagePromptLength = 1000;

/**
 * What the image should show, as the person described it: not blank, and
 * at most `maxImagePromptLength` long. It is sent to the provider as it is.
 */
export const ImagePromptSchema = Schema.String.check(
  Schema.isMaxLength(maxImagePromptLength),
  Schema.makeFilter((text: string) => text.trim() !== "", {
    expected: "a text that is not blank",
  })
).pipe(Schema.brand("ImagePrompt"));

export type ImagePrompt = typeof ImagePromptSchema.Type;

/** The description as an image prompt, or why the assistant cannot take it. */
export const checkImagePrompt = (
  text: string
): Result.Result<ImagePrompt, DraftRejected> => {
  if (text.trim() === "") {
    return Result.fail(
      new DraftRejected({ maxLength: maxImagePromptLength, reason: "empty" })
    );
  }

  return text.length > maxImagePromptLength
    ? Result.fail(
        new DraftRejected({
          maxLength: maxImagePromptLength,
          reason: "tooLong",
        })
      )
    : Result.succeed(ImagePromptSchema.make(text));
};
