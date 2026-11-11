import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";

// The `app.bsky.feed.post` record (the lexicon in github.com/bluesky-social/
// bsky, read 2026-11-11): `langs`, "Indicates human language of post primary
// text content", at most 3 tags of the `language` format (BCP 47), and
// `labels`, self-labels of `com.atproto.label.defs`, "Effectively content
// warnings". Both are fields of each part's record, so they apply to every
// part of a thread.

/** The most languages a Bluesky post names (the lexicon's `maxLength`). */
export const maxBlueskyLanguages = 3;

/**
 * A label the author puts on what a post shows, from the known values of
 * `com.atproto.label.defs#labelValue` that describe content. A label is
 * about the media: a part without media is sent without it.
 */
export const BlueskyContentLabelSchema = Schema.Literals([
  "sexual",
  "nudity",
  "porn",
  "graphic-media",
]);

export type BlueskyContentLabel = typeof BlueskyContentLabelSchema.Type;

// A BCP 47 tag, as Bluesky's `language` format takes it: a primary
// language of two or three letters, then subtags of up to eight letters or
// digits, such as "en", "pt-BR" or "zh-Hant".
const languageTag = /^[A-Za-z]{2,3}(?:-[A-Za-z\d]{1,8})*$/u;

// What Bluesky would refuse in a target's options.
const blueskyProblems = (
  options: BlueskyOptions
): readonly OptionProblem<BlueskyField>[] =>
  (options.languages ?? []).every((tag) => languageTag.test(tag))
    ? []
    : [invalid("languages")];

/**
 * How a post goes out on a Bluesky account. Nothing is needed: left out,
 * the post names no language and carries no label.
 */
export class BlueskyOptions extends Schema.Class<BlueskyOptions>(
  "peal-server/publishing/domain/BlueskyOptions"
)({
  contentLabel: Schema.optionalKey(BlueskyContentLabelSchema),
  languages: Schema.optionalKey(
    Schema.Array(PostTextSchema).check(Schema.isMaxLength(maxBlueskyLanguages))
  ),
  platform: Schema.tag("bluesky"),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<BlueskyField, FieldNotes<LookupName>>
  > = {
    contentLabel: {},
    languages: { maximum: maxBlueskyLanguages, pattern: languageTag.source },
  };

  /** No rule ties two of Bluesky's options together. */
  static readonly constraints: readonly OptionConstraint<BlueskyField>[] = [];

  /** What Bluesky would refuse in them. */
  problems(): readonly OptionProblem<BlueskyField>[] {
    return blueskyProblems(this);
  }
}

/** An option of Bluesky's. */
export type BlueskyField = Exclude<
  keyof typeof BlueskyOptions.fields,
  "platform"
>;
