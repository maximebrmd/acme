import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid, missing } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// TikTok's Content Posting API, direct post: the `post_info` of an upload,
// whose caption is the post's text on the channel. TikTok's content sharing
// guidelines ask that the creator choose who sees the post, with no default,
// that comments, Duets and Stitches stay off until the creator turns them
// on, and that a post disclosed as commercial say for whom.
//
// A video's cover is `post_info.video_cover_timestamp_ms`, "which frame
// (measured in milli-seconds) will be used as the video cover" (the direct
// post reference, read 2026-11-11). A photo post's `post_info.title` holds
// "90 in UTF-16 runes", `auto_add_music` adds recommended music, and
// `source_info.photo_cover_index` is "the index (starting from 0) of the
// photo to be used as the cover" (the photo post reference, read
// 2026-11-11).

/** The longest title of a photo post TikTok takes, in UTF-16 units. */
export const maxTikTokPhotoTitleLength = 90;

/**
 * Who can see the post: TikTok's `privacy_level`. The account may offer
 * fewer (its creator info's `privacy_level_options`), which publishing
 * checks against TikTok when the post goes out.
 */
export const TikTokPrivacyLevelSchema = Schema.Literals([
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
]);

export type TikTokPrivacyLevel = typeof TikTokPrivacyLevelSchema.Type;

// The audience that is the creator alone.
const soloAudience: TikTokPrivacyLevel = "SELF_ONLY";

const photoTitleProblems = (
  title: string | undefined
): readonly OptionProblem<TikTokField>[] => {
  const length = measureText(title ?? "", "utf16Units");

  return length > maxTikTokPhotoTitleLength
    ? [
        {
          _tag: "tooLong",
          field: "photoTitle",
          length,
          maximum: maxTikTokPhotoTitleLength,
        },
      ]
    : [];
};

// What TikTok would refuse in a target's options. Which fields go with a
// video and which with photos is the media's to say (`content-rules.ts`).
const tikTokProblems = (
  options: TikTokOptions
): readonly OptionProblem<TikTokField>[] => [
  ...photoTitleProblems(options.photoTitle),
  ...(options.privacyLevel === undefined ? [missing("privacyLevel")] : []),
  // Disclosed as commercial, without saying whose.
  ...(options.commercialContent === true &&
  options.brandOrganic !== true &&
  options.brandContent !== true
    ? [invalid("commercialContent")]
    : []),
  // TikTok shows a paid partnership to others, never to the creator alone.
  ...(options.brandContent === true && options.privacyLevel === soloAudience
    ? [invalid("brandContent")]
    : []),
];

/**
 * How a post goes out on a TikTok account. A draft may lack any of them;
 * scheduling needs `privacyLevel`. Left out, comments, Duets and Stitches
 * are off (`disable…` true), and the post discloses nothing.
 *
 * `commercialContent` is the creator saying the post promotes a brand, a
 * product or a service: then `brandOrganic` (their own business, labelled
 * "Promotional content"), `brandContent` (a paid partnership with a third
 * party, labelled "Paid partnership"), or both, must say whose. Either one
 * discloses the post, as TikTok's `brand_organic_toggle` and
 * `brand_content_toggle`. `aiGenerated` labels AI-generated content
 * (`is_aigc`).
 *
 * A video's cover is the frame at `videoCoverTimestampMs` (the first when
 * left out). A photo post's `photoTitle` is its title (none when left out:
 * the post's text is its description), `autoAddMusic` adds the music
 * TikTok recommends, and `photoCoverIndex` is the place of its cover among
 * its photos, from 0 (the first when left out).
 */
export class TikTokOptions extends Schema.Class<TikTokOptions>(
  "peal-server/publishing/domain/TikTokOptions"
)({
  aiGenerated: Schema.optionalKey(Schema.Boolean),
  autoAddMusic: Schema.optionalKey(Schema.Boolean),
  brandContent: Schema.optionalKey(Schema.Boolean),
  brandOrganic: Schema.optionalKey(Schema.Boolean),
  commercialContent: Schema.optionalKey(Schema.Boolean),
  disableComment: Schema.optionalKey(Schema.Boolean),
  disableDuet: Schema.optionalKey(Schema.Boolean),
  disableStitch: Schema.optionalKey(Schema.Boolean),
  photoCoverIndex: Schema.optionalKey(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
  ),
  photoTitle: Schema.optionalKey(PostTextSchema),
  platform: Schema.tag("tiktok"),
  privacyLevel: Schema.optionalKey(TikTokPrivacyLevelSchema),
  videoCoverTimestampMs: Schema.optionalKey(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
  ),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<Record<TikTokField, FieldNotes<LookupName>>> =
    {
      aiGenerated: { ifLeftOut: false },
      autoAddMusic: { ifLeftOut: false },
      brandContent: { ifLeftOut: false },
      brandOrganic: { ifLeftOut: false },
      commercialContent: { ifLeftOut: false },
      disableComment: { ifLeftOut: true },
      disableDuet: { ifLeftOut: true },
      disableStitch: { ifLeftOut: true },
      photoCoverIndex: { ifLeftOut: 0, minimum: 0 },
      photoTitle: { maxLength: maxTikTokPhotoTitleLength },
      privacyLevel: { lookup: "tiktokCreator" },
      videoCoverTimestampMs: { ifLeftOut: 0, minimum: 0 },
    };

  /** The rules between options that `problems` applies. */
  static readonly constraints: readonly OptionConstraint<TikTokField>[] = [
    {
      _tag: "needsOneOf",
      field: "commercialContent",
      oneOf: ["brandOrganic", "brandContent"],
    },
    {
      _tag: "notWith",
      field: "brandContent",
      other: "privacyLevel",
      value: soloAudience,
    },
  ];

  /** What TikTok would refuse in them. */
  problems(): readonly OptionProblem<TikTokField>[] {
    return tikTokProblems(this);
  }
}

/** An option of TikTok's. */
export type TikTokField = Exclude<
  keyof typeof TikTokOptions.fields,
  "platform"
>;
