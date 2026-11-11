import { Schema } from "effect";

import { MediaAssetIdSchema } from "#shared/domain/ids.ts";

import type { FieldNotes } from "./field-description.ts";
import { languageTag } from "./language-tag.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid, missing } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// YouTube's videos.insert: snippet.title, snippet.tags, snippet.categoryId
// and snippet.defaultLanguage, status.privacyStatus,
// status.selfDeclaredMadeForKids, status.containsSyntheticMedia,
// status.license, status.embeddable and status.publicStatsViewable,
// recordingDetails.recordingDate, and the notifySubscribers parameter (the
// insert page's list of settable properties, read 2026-11-11). The video's
// description is the post's text on the channel. A custom thumbnail is
// another call, thumbnails.set, once the video exists.

/** The longest title YouTube takes, in characters. */
export const maxYouTubeTitleLength = 100;

/**
 * The most YouTube takes of all the tags together, in characters: commas
 * between tags count, and a tag with a space counts the quotes YouTube puts
 * around it.
 */
export const maxYouTubeTagsLength = 500;

/**
 * The largest thumbnail Peal sends, in bytes: Peal's ceiling, as
 * thumbnails.set takes up to 50 MB ("Maximum file size: 50MB", read
 * 2026-11-11), and a thumbnail is a small image.
 */
export const maxYouTubeThumbnailByteSize = 8 * 1024 * 1024;

/**
 * The image types a thumbnail may be: thumbnails.set's "Accepted Media MIME
 * types" (read 2026-11-11), of those Peal's library stores.
 */
export const youTubeThumbnailTypes = ["image/jpeg", "image/png"] as const;

/**
 * Under which licence the video is published: YouTube's standard licence
 * when none is given, or Creative Commons (`status.license`).
 */
export const YouTubeLicenseSchema = Schema.Literals([
  "youtube",
  "creativeCommon",
]);

export type YouTubeLicense = typeof YouTubeLicenseSchema.Type;

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

// A day of the calendar, as `2026-11-27`: the day the video was recorded.
const calendarDay = /^\d{4}-\d{2}-\d{2}$/u;

// Whether the text is a day that exists (no 31 November).
const isCalendarDay = (text: string) => {
  if (!calendarDay.test(text)) {
    return false;
  }

  const [year = 0, month = 0, day = 0] = text.split("-").map(Number);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const length = lengths[month - 1];

  return length !== undefined && day >= 1 && day <= length;
};

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
  ...(options.defaultLanguage === undefined ||
  languageTag.test(options.defaultLanguage)
    ? []
    : [invalid("defaultLanguage")]),
  ...(options.recordingDate === undefined ||
  isCalendarDay(options.recordingDate)
    ? []
    : [invalid("recordingDate")]),
];

/**
 * How a post goes out on a YouTube channel. A draft may lack any of them;
 * scheduling needs `title` and `madeForKids`, which YouTube asks every
 * upload to declare. Left out, `privacy` is public, `notifySubscribers`
 * true, and the video holds no altered or synthetic content; its licence,
 * whether it may be embedded and whether its statistics are public are
 * what YouTube gives an upload that says nothing of them.
 *
 * `thumbnailMediaId` names an image of the workspace's library, JPEG or
 * PNG, set as the video's thumbnail once it is uploaded: a channel YouTube
 * does not allow custom thumbnails keeps the one YouTube picks, and the
 * post is published all the same (`thumbnailNotSet`).
 */
export class YouTubeOptions extends Schema.Class<YouTubeOptions>(
  "peal-server/publishing/domain/YouTubeOptions"
)({
  // A number YouTube's videoCategories list gives, such as "22".
  categoryId: Schema.optionalKey(PostTextSchema),
  // Altered or synthetic content that looks real, which YouTube labels.
  containsSyntheticMedia: Schema.optionalKey(Schema.Boolean),
  // The language of the title and the description, a BCP 47 tag.
  defaultLanguage: Schema.optionalKey(PostTextSchema),
  embeddable: Schema.optionalKey(Schema.Boolean),
  license: Schema.optionalKey(YouTubeLicenseSchema),
  madeForKids: Schema.optionalKey(Schema.Boolean),
  notifySubscribers: Schema.optionalKey(Schema.Boolean),
  platform: Schema.tag("youtube"),
  privacy: Schema.optionalKey(YouTubePrivacySchema),
  publicStatsViewable: Schema.optionalKey(Schema.Boolean),
  // The day it was recorded, as `2026-11-27`.
  recordingDate: Schema.optionalKey(PostTextSchema),
  tags: Schema.optionalKey(
    Schema.Array(PostTextSchema).check(Schema.isMaxLength(maxYouTubeTagsLength))
  ),
  thumbnailMediaId: Schema.optionalKey(MediaAssetIdSchema),
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
    defaultLanguage: { pattern: languageTag.source },
    // Left out, YouTube decides, from the channel's upload defaults: Peal
    // cannot say what it decides.
    embeddable: {},
    license: {},
    madeForKids: {},
    notifySubscribers: { ifLeftOut: true },
    privacy: { ifLeftOut: "public" },
    publicStatsViewable: {},
    recordingDate: { pattern: calendarDay.source },
    tags: {
      forbiddenCharacters: tagForbidden,
      maxLength: maxYouTubeTagsLength,
    },
    thumbnailMediaId: {
      contentTypes: youTubeThumbnailTypes,
      maxByteSize: maxYouTubeThumbnailByteSize,
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
