import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid, missing } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";

// TikTok's Content Posting API, direct post: the `post_info` of an upload,
// whose caption is the post's text on the channel. TikTok's content sharing
// guidelines ask that the creator choose who sees the post, with no default,
// that comments, Duets and Stitches stay off until the creator turns them
// on, and that a post disclosed as commercial say for whom.

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

// What TikTok would refuse in a target's options.
const tikTokProblems = (
  options: TikTokOptions
): readonly OptionProblem<TikTokField>[] => [
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
 */
export class TikTokOptions extends Schema.Class<TikTokOptions>(
  "peal-server/publishing/domain/TikTokOptions"
)({
  aiGenerated: Schema.optionalKey(Schema.Boolean),
  brandContent: Schema.optionalKey(Schema.Boolean),
  brandOrganic: Schema.optionalKey(Schema.Boolean),
  commercialContent: Schema.optionalKey(Schema.Boolean),
  disableComment: Schema.optionalKey(Schema.Boolean),
  disableDuet: Schema.optionalKey(Schema.Boolean),
  disableStitch: Schema.optionalKey(Schema.Boolean),
  platform: Schema.tag("tiktok"),
  privacyLevel: Schema.optionalKey(TikTokPrivacyLevelSchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<Record<TikTokField, FieldNotes<LookupName>>> =
    {
      aiGenerated: { ifLeftOut: false },
      brandContent: { ifLeftOut: false },
      brandOrganic: { ifLeftOut: false },
      commercialContent: { ifLeftOut: false },
      disableComment: { ifLeftOut: true },
      disableDuet: { ifLeftOut: true },
      disableStitch: { ifLeftOut: true },
      privacyLevel: { lookup: "tiktokCreator" },
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
