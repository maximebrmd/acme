import { Schema } from "effect";

import { PlatformSchema } from "./platform.ts";
import type { Platform } from "./platform.ts";
import { maxPostTextLength, measureText } from "./post-text.ts";

// What a post says on one of its channels that only the channel's platform
// knows, tagged by `platform`. The server's options
// (src/publishing/domain/target-options.ts, and each platform's beside it)
// are the source; a test keeps the two equal. A draft may hold them
// unfinished: the platform's rules apply when the post is scheduled, and
// their violations name the option (`field`) they are about.

const nul = String.fromCodePoint(0);

// Postgres keeps no NUL character in a JSON string, and no platform takes
// one.
const OptionTextSchema = Schema.String.check(
  Schema.isMaxLength(maxPostTextLength),
  Schema.makeFilter((text: string) => !text.includes(nul), {
    expected: "text without NUL characters",
  })
);

/** The longest title YouTube takes, in characters (code points). */
export const maxYouTubeTitleLength = 100;

/**
 * The most YouTube takes of all a video's tags together, in characters:
 * commas between tags count, and a tag with a space counts the quotes
 * YouTube puts around it (`youTubeTagsLength`).
 */
export const maxYouTubeTagsLength = 500;

/** How YouTube counts a video's tags against `maxYouTubeTagsLength`. */
export const youTubeTagsLength = (tags: readonly string[]): number =>
  tags.reduce(
    (length, tag) =>
      length + measureText(tag, "codePoints") + (tag.includes(" ") ? 2 : 0),
    Math.max(tags.length - 1, 0)
  );

/** Who can watch a YouTube video. */
export const YouTubePrivacySchema = Schema.Literals([
  "public",
  "unlisted",
  "private",
]).annotate({ identifier: "YouTubePrivacy" });

export type YouTubePrivacy = typeof YouTubePrivacySchema.Type;

/** A video on a YouTube channel: its description is the post's text there. */
export const YouTubeOptionsSchema = Schema.Struct({
  // A category id from YouTube's videoCategories list: digits, such as "22".
  categoryId: Schema.optionalKey(OptionTextSchema),
  // It holds altered or synthetic content that looks real, which YouTube
  // labels. False when left out.
  containsSyntheticMedia: Schema.optionalKey(Schema.Boolean),
  // Whether it is made for kids, which YouTube asks of every upload:
  // required to schedule.
  madeForKids: Schema.optionalKey(Schema.Boolean),
  // Whether subscribers are told about it. True when left out.
  notifySubscribers: Schema.optionalKey(Schema.Boolean),
  platform: Schema.Literal("youtube"),
  // Public when left out.
  privacy: Schema.optionalKey(YouTubePrivacySchema),
  // Without commas, `maxYouTubeTagsLength` together.
  tags: Schema.optionalKey(
    Schema.Array(OptionTextSchema).check(
      Schema.isMaxLength(maxYouTubeTagsLength)
    )
  ),
  // Required to schedule: at most `maxYouTubeTitleLength` characters,
  // without "<" or ">".
  title: Schema.optionalKey(OptionTextSchema),
}).annotate({
  description:
    "How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`.",
  identifier: "YouTubeOptions",
});

export type YouTubeOptions = typeof YouTubeOptionsSchema.Type;

/**
 * Who can see a TikTok post. The account may offer fewer, as TikTok's
 * creator info says.
 */
export const TikTokPrivacyLevelSchema = Schema.Literals([
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
]).annotate({ identifier: "TikTokPrivacyLevel" });

export type TikTokPrivacyLevel = typeof TikTokPrivacyLevelSchema.Type;

/** A post on a TikTok account: its caption is the post's text there. */
export const TikTokOptionsSchema = Schema.Struct({
  // Labels the post as AI-generated content. False when left out.
  aiGenerated: Schema.optionalKey(Schema.Boolean),
  // A paid partnership with a third party: labelled "Paid partnership",
  // never with `privacyLevel` SELF_ONLY.
  brandContent: Schema.optionalKey(Schema.Boolean),
  // Promotes the creator's own business: labelled "Promotional content".
  brandOrganic: Schema.optionalKey(Schema.Boolean),
  // The creator says it promotes a brand, a product or a service: then
  // `brandOrganic`, `brandContent` or both say whose.
  commercialContent: Schema.optionalKey(Schema.Boolean),
  // Comments, Duets and Stitches are off when left out, until the creator
  // turns them on.
  disableComment: Schema.optionalKey(Schema.Boolean),
  disableDuet: Schema.optionalKey(Schema.Boolean),
  disableStitch: Schema.optionalKey(Schema.Boolean),
  platform: Schema.Literal("tiktok"),
  // Required to schedule, with no default: the creator chooses.
  privacyLevel: Schema.optionalKey(TikTokPrivacyLevelSchema),
}).annotate({
  description:
    "How a post goes out on a TikTok account. Scheduling needs `privacyLevel`.",
  identifier: "TikTokOptions",
});

export type TikTokOptions = typeof TikTokOptionsSchema.Type;

/** Who sees a LinkedIn post. `connections` is for a member's profile. */
export const LinkedInVisibilitySchema = Schema.Literals([
  "public",
  "connections",
  "loggedIn",
]).annotate({ identifier: "LinkedInVisibility" });

export type LinkedInVisibility = typeof LinkedInVisibilitySchema.Type;

/** The longest title of a LinkedIn document Peal takes, in characters. */
export const maxLinkedInDocumentTitleLength = 400;

/** The longest title of a LinkedIn link Peal takes, in characters. */
export const maxLinkedInLinkTitleLength = 400;

/** The longest description of a LinkedIn link Peal takes, in characters. */
export const maxLinkedInLinkDescriptionLength = 4000;

/** The longest address of a LinkedIn link Peal takes, in characters. */
export const maxLinkedInLinkUrlLength = 2000;

/** The most pages one LinkedIn post names. */
export const maxLinkedInMentions = 30;

/** The longest name a mention holds, in UTF-16 code units. */
export const maxLinkedInMentionNameLength = 200;

/**
 * A company page a LinkedIn post names: its full name, exactly as the
 * `linkedinOrganizations` lookup answers it, and its URN
 * (`urn:li:organization:<id>`). LinkedIn links it where the post's text
 * holds `@` followed by that name.
 */
export const LinkedInMentionSchema = Schema.Struct({
  name: Schema.String.check(
    Schema.isMaxLength(maxLinkedInMentionNameLength),
    Schema.makeFilter((text: string) => !text.includes(nul), {
      expected: "text without NUL characters",
    })
  ),
  urn: Schema.String.check(Schema.isMaxLength(64)),
}).annotate({ identifier: "LinkedInMention" });

export type LinkedInMention = typeof LinkedInMentionSchema.Type;

/**
 * A post on a LinkedIn profile or company page: its commentary is the
 * post's text there.
 */
export const LinkedInOptionsSchema = Schema.Struct({
  disableReshare: Schema.optionalKey(Schema.Boolean),
  documentTitle: Schema.optionalKey(OptionTextSchema),
  linkDescription: Schema.optionalKey(OptionTextSchema),
  linkTitle: Schema.optionalKey(OptionTextSchema),
  linkUrl: Schema.optionalKey(OptionTextSchema),
  mentions: Schema.optionalKey(
    Schema.Array(LinkedInMentionSchema).check(
      Schema.isMaxLength(maxLinkedInMentions)
    )
  ),
  platform: Schema.Literal("linkedin"),
  visibility: Schema.optionalKey(LinkedInVisibilitySchema),
}).annotate({
  description:
    "How a post goes out on a LinkedIn profile or company page. Scheduling needs none of them; a link (`linkUrl`) needs its `linkTitle`.",
  identifier: "LinkedInOptions",
});

export type LinkedInOptions = typeof LinkedInOptionsSchema.Type;

/**
 * What a post says on a channel that only its platform knows, tagged by
 * `platform`. Platforms without a member here take no options.
 */
export const TargetOptionsSchema = Schema.Union([
  YouTubeOptionsSchema,
  TikTokOptionsSchema,
  LinkedInOptionsSchema,
]).annotate({
  description:
    "What a post says on a channel that only its platform knows, tagged by `platform`. Platforms without options take none.",
  identifier: "TargetOptions",
});

export type TargetOptions = typeof TargetOptionsSchema.Type;

/** The platforms that take options. */
export type OptionsPlatform = TargetOptions["platform"];

const isOptions = Schema.is(TargetOptionsSchema);

/** The platforms that take options, in the platforms' order. */
export const optionsPlatforms: readonly Platform[] =
  PlatformSchema.literals.filter((platform) => isOptions({ platform }));

/** The options a post is given on one of its channels. */
export const ChannelOptionsSchema = Schema.Struct({
  channelId: Schema.String,
  options: TargetOptionsSchema,
}).annotate({ identifier: "ChannelOptions" });

export type ChannelOptions = typeof ChannelOptionsSchema.Type;
