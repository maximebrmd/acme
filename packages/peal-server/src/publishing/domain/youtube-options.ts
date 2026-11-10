import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid, missing } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// YouTube's videos.insert: snippet.title, snippet.tags and snippet.categoryId,
// status.privacyStatus, status.selfDeclaredMadeForKids and
// status.containsSyntheticMedia, and the notifySubscribers parameter. The
// video's description is the post's text on the channel.

/** The longest title YouTube takes, in characters. */
export const maxYouTubeTitleLength = 100;

/**
 * The most YouTube takes of all the tags together, in characters: commas
 * between tags count, and a tag with a space counts the quotes YouTube puts
 * around it.
 */
export const maxYouTubeTagsLength = 500;

/** Who can watch the video. YouTube makes it public when none is given. */
export const YouTubePrivacySchema = Schema.Literals([
  "public",
  "unlisted",
  "private",
]);

export type YouTubePrivacy = typeof YouTubePrivacySchema.Type;

// The characters YouTube refuses in a title.
const titleForbidden = ["<", ">"] as const;

// A comma would split a tag in two.
const tagForbidden = [","] as const;

const holdsAny = (text: string, forbidden: readonly string[]) =>
  forbidden.some((character) => text.includes(character));

const characters = (text: string) => measureText(text, "codePoints");

/** How YouTube counts the tags against `maxYouTubeTagsLength`. */
export const youTubeTagsLength = (tags: readonly string[]): number =>
  tags.reduce(
    (length, tag) => length + characters(tag) + (tag.includes(" ") ? 2 : 0),
    Math.max(tags.length - 1, 0)
  );

const titleProblems = (
  title: string | undefined
): readonly OptionProblem<YouTubeField>[] => {
  if (title === undefined || title.trim() === "") {
    return [missing("title")];
  }

  const length = characters(title);

  return [
    ...(length > maxYouTubeTitleLength
      ? [
          {
            _tag: "tooLong" as const,
            field: "title" as const,
            length,
            maximum: maxYouTubeTitleLength,
          },
        ]
      : []),
    ...(holdsAny(title, titleForbidden) ? [invalid("title")] : []),
  ];
};

// A blank tag, or one holding a comma, which would split it, is refused.
const tagsProblems = (
  tags: readonly string[]
): readonly OptionProblem<YouTubeField>[] => {
  const length = youTubeTagsLength(tags);

  return [
    ...(tags.some((tag) => tag.trim() === "" || holdsAny(tag, tagForbidden))
      ? [invalid("tags")]
      : []),
    ...(length > maxYouTubeTagsLength
      ? [
          {
            _tag: "tooLong" as const,
            field: "tags" as const,
            length,
            maximum: maxYouTubeTagsLength,
          },
        ]
      : []),
  ];
};

const categoryId = /^\d+$/u;

// What YouTube would refuse in a target's options.
const youTubeProblems = (
  options: YouTubeOptions
): readonly OptionProblem<YouTubeField>[] => [
  ...titleProblems(options.title),
  ...(options.madeForKids === undefined ? [missing("madeForKids")] : []),
  ...tagsProblems(options.tags ?? []),
  ...(options.categoryId === undefined || categoryId.test(options.categoryId)
    ? []
    : [invalid("categoryId")]),
];

/**
 * How a post goes out on a YouTube channel. A draft may lack any of them;
 * scheduling needs `title` and `madeForKids`, which YouTube asks every
 * upload to declare. Left out, `privacy` is public, `notifySubscribers`
 * true, and the video holds no altered or synthetic content.
 */
export class YouTubeOptions extends Schema.Class<YouTubeOptions>(
  "peal-server/publishing/domain/YouTubeOptions"
)({
  // A number YouTube's videoCategories list gives, such as "22".
  categoryId: Schema.optionalKey(PostTextSchema),
  // Altered or synthetic content that looks real, which YouTube labels.
  containsSyntheticMedia: Schema.optionalKey(Schema.Boolean),
  madeForKids: Schema.optionalKey(Schema.Boolean),
  notifySubscribers: Schema.optionalKey(Schema.Boolean),
  platform: Schema.tag("youtube"),
  privacy: Schema.optionalKey(YouTubePrivacySchema),
  tags: Schema.optionalKey(
    Schema.Array(PostTextSchema).check(Schema.isMaxLength(maxYouTubeTagsLength))
  ),
  title: Schema.optionalKey(PostTextSchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<YouTubeField, FieldNotes<LookupName>>
  > = {
    categoryId: {
      lookup: "youtubeVideoCategories",
      pattern: categoryId.source,
    },
    containsSyntheticMedia: { ifLeftOut: false },
    madeForKids: {},
    notifySubscribers: { ifLeftOut: true },
    privacy: { ifLeftOut: "public" },
    tags: {
      forbiddenCharacters: tagForbidden,
      maxLength: maxYouTubeTagsLength,
    },
    title: {
      forbiddenCharacters: titleForbidden,
      maxLength: maxYouTubeTitleLength,
    },
  };

  /** No rule ties two of YouTube's options together. */
  static readonly constraints: readonly OptionConstraint<YouTubeField>[] = [];

  /** What YouTube would refuse in them. */
  problems(): readonly OptionProblem<YouTubeField>[] {
    return youTubeProblems(this);
  }
}

/** An option of YouTube's. */
export type YouTubeField = Exclude<
  keyof typeof YouTubeOptions.fields,
  "platform"
>;
