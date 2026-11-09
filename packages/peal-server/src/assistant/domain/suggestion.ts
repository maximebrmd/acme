import { Array as Arr, Option, Result, Schema } from "effect";

import { AnswerRejected } from "./answer-rejected.ts";
import { maxDraftLength } from "./draft.ts";
import type { Draft } from "./draft.ts";
import { maxSuggestedHashtags } from "./writing-prompt.ts";

// The shapes the model is asked to answer in, as structured output. They
// stay plain (strings, an array of strings) so every provider can follow
// them; the rules below then decide what is kept.

/** A text that replaces the draft. */
export const TextAnswerSchema = Schema.Struct({
  text: Schema.String.annotate({
    description: "The new text of the post, as plain text.",
  }),
});

export type TextAnswer = typeof TextAnswerSchema.Type;

/** Hashtags to add to the draft. */
export const HashtagsAnswerSchema = Schema.Struct({
  hashtags: Schema.Array(
    Schema.String.annotate({ description: "A hashtag, such as #launch." })
  ),
});

export type HashtagsAnswer = typeof HashtagsAnswerSchema.Type;

/**
 * The longest text the assistant suggests: twice the longest draft, so a
 * translation into a wordier language still fits.
 */
export const maxSuggestionLength = 2 * maxDraftLength;

// A hashtag as publishing counts them: letters, digits and underscores
// after the #, with at least one letter. Digits and underscores lead up to
// the first letter, so each character can be read only one way and a long
// answer is read in linear time.
const hashtagPattern = /^#[\p{N}_]*\p{L}[\p{L}\p{N}_]*$/u;

const hashtagsIn = /(?<![\p{L}\p{N}_&#])#[\p{N}_]*\p{L}[\p{L}\p{N}_]*/gu;

export const HashtagSchema = Schema.String.check(
  Schema.isPattern(hashtagPattern),
  Schema.isMaxLength(100)
).pipe(Schema.brand("Hashtag"));

export type Hashtag = typeof HashtagSchema.Type;

const decodeHashtag = Schema.decodeUnknownOption(HashtagSchema);

/** What the assistant offers: a new text, or hashtags to add. */
export const SuggestionSchema = Schema.Union([
  Schema.TaggedStruct("text", {
    text: Schema.String.check(
      Schema.isNonEmpty(),
      Schema.isMaxLength(maxSuggestionLength)
    ),
  }),
  Schema.TaggedStruct("hashtags", {
    hashtags: Schema.NonEmptyArray(HashtagSchema).check(
      Schema.isMaxLength(maxSuggestedHashtags)
    ),
  }),
]);

export type Suggestion = typeof SuggestionSchema.Type;

/**
 * The text a model answered with, as a suggestion: without the spaces
 * around it, and refused when nothing is left or when it is longer than
 * any post the assistant writes.
 */
export const acceptText = ({
  text,
}: TextAnswer): Result.Result<Suggestion, AnswerRejected> => {
  const trimmed = text.trim();

  if (trimmed === "") {
    return Result.fail(new AnswerRejected({ reason: "empty" }));
  }

  return trimmed.length > maxSuggestionLength
    ? Result.fail(new AnswerRejected({ reason: "tooLong" }))
    : Result.succeed({ _tag: "text", text: trimmed });
};

// A proposal reads the same with or without its # and spaces around it:
// "launch" and " #launch " are both "#launch".
const asHashtag = (proposed: string): Option.Option<Hashtag> => {
  const trimmed = proposed.trim();

  return decodeHashtag(trimmed.startsWith("#") ? trimmed : `#${trimmed}`);
};

const folded = (hashtag: string) => hashtag.toLowerCase();

/**
 * The hashtags a model proposed, as a suggestion: each written with its #,
 * once whatever its case, none the draft already has, and at most
 * `maxSuggestedHashtags`. Anything that does not read as a hashtag is
 * dropped; refused when none is left.
 */
export const acceptHashtags = (
  { hashtags }: HashtagsAnswer,
  draft: Draft
): Result.Result<Suggestion, AnswerRejected> => {
  const present = new Set(
    Array.from(draft.matchAll(hashtagsIn), ([hashtag]) => folded(hashtag))
  );

  const fresh = Arr.dedupeWith(
    hashtags.flatMap((proposed) => Option.toArray(asHashtag(proposed))),
    (first, second) => folded(first) === folded(second)
  )
    .filter((hashtag) => !present.has(folded(hashtag)))
    .slice(0, maxSuggestedHashtags);

  return Arr.isReadonlyArrayNonEmpty(fresh)
    ? Result.succeed({ _tag: "hashtags", hashtags: fresh })
    : Result.fail(new AnswerRejected({ reason: "noHashtags" }));
};
