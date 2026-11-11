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
// part of a thread. Who may reply is the thread's: an
// `app.bsky.feed.threadgate` record under its first post's record key ("If
// value is an empty array, no one can reply. If value is undefined, anyone
// can reply."). Quoting is each post's: an `app.bsky.feed.postgate` record
// under the post's key, with its `#disableRule`.

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

/**
 * Who may reply to the thread: everyone (no gate), nobody, or only those
 * the `reply…` options name (`limited`).
 */
export const BlueskyRepliesSchema = Schema.Literals([
  "everyone",
  "nobody",
  "limited",
]);

export type BlueskyReplies = typeof BlueskyRepliesSchema.Type;

// The value that lets the `reply…` options in.
const limited: readonly BlueskyReplies[] = ["limited"];

/** The options that ask for a gate record, which needs its own scope. */
export const blueskyGateFields = ["disableQuotes", "replies"] as const;

/** Whether the options ask for a reply gate on the thread. */
export const gatesReplies = (options: BlueskyOptions): boolean =>
  options.replies !== undefined && options.replies !== "everyone";

/** Whether the options ask for a quote gate on each post. */
export const gatesQuotes = (options: BlueskyOptions): boolean =>
  options.disableQuotes === true;

/** The gates the options ask for, by the field that asks. */
export const gatesAskedBy = (
  options: BlueskyOptions
): readonly (typeof blueskyGateFields)[number][] => [
  ...(gatesQuotes(options) ? (["disableQuotes"] as const) : []),
  ...(gatesReplies(options) ? (["replies"] as const) : []),
];

// A BCP 47 tag (RFC 5646's langtag), as Bluesky's `language` format takes
// it (`isValidLanguage` in atproto's syntax package, read 2026-11-11): a
// primary language of two or three letters, up to three extended ones, a
// script of four letters, a region of two letters or three digits,
// variants, extensions behind a singleton, and private use behind `x`,
// such as "en", "pt-BR", "zh-Hant-TW" or "es-419". Peal takes no
// grandfathered tag, and does not look for a variant or a singleton
// repeated, which the PDS also refuses.
const languageTag =
  /^[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|\d{3}))?(?:-(?:[A-Za-z\d]{5,8}|\d[A-Za-z\d]{3}))*(?:-[\dA-WY-Za-wy-z](?:-[A-Za-z\d]{2,8})+)*(?:-[Xx](?:-[A-Za-z\d]{1,8})+)?$/u;

const replyRules = [
  "replyFollowers",
  "replyFollowing",
  "replyMentioned",
] as const;

// What Bluesky would refuse in a target's options.
const blueskyProblems = (
  options: BlueskyOptions
): readonly OptionProblem<BlueskyField>[] => [
  ...((options.languages ?? []).every((tag) => languageTag.test(tag))
    ? []
    : [invalid("languages")]),
  // Limited to nobody is `nobody`: say who.
  ...(options.replies === "limited" &&
  replyRules.every((rule) => options[rule] !== true)
    ? [invalid("replies")]
    : []),
  ...replyRules.flatMap((rule) =>
    options[rule] === true && options.replies !== "limited"
      ? [invalid(rule)]
      : []
  ),
];

/**
 * How a post goes out on a Bluesky account. Nothing is needed: left out,
 * the post names no language and carries no label, everyone may reply and
 * anyone may quote it. `replies` `limited` lets those reply that
 * `replyMentioned` (accounts the post mentions), `replyFollowing` (accounts
 * the author follows) and `replyFollowers` (the author's followers) say,
 * one of them at least. `disableQuotes` keeps every part from being quoted.
 * The two gates need the channel to have granted their scopes
 * (`blueskyGateScopes`), which channels connected before them have not.
 */
export class BlueskyOptions extends Schema.Class<BlueskyOptions>(
  "peal-server/publishing/domain/BlueskyOptions"
)({
  contentLabel: Schema.optionalKey(BlueskyContentLabelSchema),
  disableQuotes: Schema.optionalKey(Schema.Boolean),
  languages: Schema.optionalKey(
    Schema.Array(PostTextSchema).check(Schema.isMaxLength(maxBlueskyLanguages))
  ),
  platform: Schema.tag("bluesky"),
  replies: Schema.optionalKey(BlueskyRepliesSchema),
  replyFollowers: Schema.optionalKey(Schema.Boolean),
  replyFollowing: Schema.optionalKey(Schema.Boolean),
  replyMentioned: Schema.optionalKey(Schema.Boolean),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<BlueskyField, FieldNotes<LookupName>>
  > = {
    contentLabel: {},
    disableQuotes: { ifLeftOut: false },
    languages: { maximum: maxBlueskyLanguages, pattern: languageTag.source },
    replies: { ifLeftOut: "everyone" },
    replyFollowers: { ifLeftOut: false },
    replyFollowing: { ifLeftOut: false },
    replyMentioned: { ifLeftOut: false },
  };

  /** Each of who may reply is taken with replies limited to some. */
  static readonly constraints: readonly OptionConstraint<BlueskyField>[] =
    replyRules.map((field) => ({
      _tag: "onlyWith",
      field,
      other: "replies",
      values: limited,
    }));

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
