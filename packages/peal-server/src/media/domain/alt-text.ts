import { Option, Result, Schema } from "effect";

import { AltTextTooLong } from "./alt-text-too-long.ts";

/**
 * The most characters Peal keeps in a description: more than platforms
 * show, so no description is cut here. Each platform's own limit is checked
 * when a post is scheduled.
 */
export const maxAltTextLength = 2000;

/**
 * What a piece of media shows, for people who cannot see it: the alternative
 * text platforms attach to it. Never empty, and without surrounding spaces.
 */
export const AltTextSchema = Schema.Trimmed.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(maxAltTextLength)
).pipe(Schema.brand("AltText"));

export type AltText = typeof AltTextSchema.Type;

/**
 * A description as a person typed it, trimmed: none when nothing is left,
 * `AltTextTooLong` past the limit.
 */
export const altTextOf = (
  text: string
): Result.Result<Option.Option<AltText>, AltTextTooLong> => {
  const trimmed = text.trim();

  if (trimmed === "") {
    return Result.succeed(Option.none());
  }

  if (trimmed.length > maxAltTextLength) {
    return Result.fail(
      new AltTextTooLong({
        length: trimmed.length,
        maxLength: maxAltTextLength,
      })
    );
  }

  return Result.succeed(Option.some(AltTextSchema.make(trimmed)));
};
