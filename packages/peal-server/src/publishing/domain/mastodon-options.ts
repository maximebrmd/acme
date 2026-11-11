import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// Mastodon's POST /api/v1/statuses (docs.joinmastodon.org/methods/statuses,
// read 2026-11-11): `visibility`, `sensitive`, `spoiler_text`, `language`
// and, since Mastodon 4.5.0 (API version 7), `quote_approval_policy`. Each
// applies to every part of a thread, as each part is a status of its own.
// A server before 4.5 drops the quote policy unread (its statuses
// controller permits only the parameters it knows).

/**
 * The longest content warning Peal takes, in characters: Peal's ceiling,
 * as Mastodon gives none of its own. Mastodon counts the warning in the
 * status's character limit with the text (`StatusLengthValidator` joins
 * the two), so the text's limit on a Mastodon channel applies to both.
 */
export const maxMastodonContentWarningLength = 500;

/**
 * Who sees the status. `direct`, a private mention, is not offered: its
 * audience is whoever the text mentions, which is a message, not a post.
 * Left out, the account's own default applies.
 */
export const MastodonVisibilitySchema = Schema.Literals([
  "public",
  "unlisted",
  "private",
]);

export type MastodonVisibility = typeof MastodonVisibilitySchema.Type;

/**
 * Who may quote the status. Left out, the account's own default applies;
 * a status seen by followers only (`private`) is quoted by nobody,
 * whatever it says.
 */
export const MastodonQuotePolicySchema = Schema.Literals([
  "public",
  "followers",
  "nobody",
]);

export type MastodonQuotePolicy = typeof MastodonQuotePolicySchema.Type;

// "ISO 639-1 language code for this status": two lower-case letters, or
// three as some servers know ISO 639-3 codes.
const languageCode = /^[a-z]{2,3}$/u;

// The visibilities a quote policy means something with.
const quotable: readonly MastodonVisibility[] = ["public", "unlisted"];

// A content warning is one line, as Mastodon's composer writes it.
const warningForbidden = ["\n", "\r"] as const;

const warningProblems = (
  warning: string | undefined
): readonly OptionProblem<MastodonField>[] => {
  if (warning === undefined) {
    return [];
  }

  const length = measureText(warning, "codePoints");

  return [
    ...(warning.trim() === "" ||
    warningForbidden.some((character) => warning.includes(character))
      ? [invalid("contentWarning")]
      : []),
    ...(length > maxMastodonContentWarningLength
      ? [
          {
            _tag: "tooLong" as const,
            field: "contentWarning" as const,
            length,
            maximum: maxMastodonContentWarningLength,
          },
        ]
      : []),
  ];
};

// What Mastodon would refuse, or ignore against the member's choice.
const mastodonProblems = (
  options: MastodonOptions
): readonly OptionProblem<MastodonField>[] => [
  ...warningProblems(options.contentWarning),
  ...(options.language === undefined || languageCode.test(options.language)
    ? []
    : [invalid("language")]),
  // Mastodon sets a followers-only status's policy to nobody: a policy
  // chosen there would not be the one it gets.
  ...(options.quotePolicy !== undefined &&
  options.visibility !== undefined &&
  !quotable.includes(options.visibility)
    ? [invalid("quotePolicy")]
    : []),
];

/**
 * How a post goes out on a Mastodon account, on every part of a thread.
 * Nothing is needed: left out, `visibility` and `quotePolicy` are the
 * account's own defaults, the post is not marked sensitive, carries no
 * content warning, and its language is the instance's guess.
 */
export class MastodonOptions extends Schema.Class<MastodonOptions>(
  "peal-server/publishing/domain/MastodonOptions"
)({
  // Shown before the text, which is folded behind it.
  contentWarning: Schema.optionalKey(PostTextSchema),
  language: Schema.optionalKey(PostTextSchema),
  platform: Schema.tag("mastodon"),
  quotePolicy: Schema.optionalKey(MastodonQuotePolicySchema),
  // Marks the status and its media as sensitive.
  sensitive: Schema.optionalKey(Schema.Boolean),
  visibility: Schema.optionalKey(MastodonVisibilitySchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<MastodonField, FieldNotes<LookupName>>
  > = {
    contentWarning: {
      forbiddenCharacters: warningForbidden,
      maxLength: maxMastodonContentWarningLength,
    },
    language: { pattern: languageCode.source },
    quotePolicy: {},
    sensitive: { ifLeftOut: false },
    visibility: {},
  };

  /** A quote policy means something on a status others may see. */
  static readonly constraints: readonly OptionConstraint<MastodonField>[] = [
    {
      _tag: "onlyWith",
      field: "quotePolicy",
      other: "visibility",
      values: quotable,
    },
  ];

  /** What Mastodon would refuse in them. */
  problems(): readonly OptionProblem<MastodonField>[] {
    return mastodonProblems(this);
  }
}

/** An option of Mastodon's. */
export type MastodonField = Exclude<
  keyof typeof MastodonOptions.fields,
  "platform"
>;
