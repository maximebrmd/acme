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

/** What kind of post goes out on a Google Business Profile location. */
export const GoogleBusinessPostTypeSchema = Schema.Literals([
  "standard",
  "event",
  "offer",
]).annotate({ identifier: "GoogleBusinessPostType" });

export type GoogleBusinessPostType = typeof GoogleBusinessPostTypeSchema.Type;

/**
 * The button under a Google Business Profile post. Every one opens
 * `callToActionUrl`, but `call`, which rings the location's own number.
 */
export const GoogleBusinessCallToActionSchema = Schema.Literals([
  "book",
  "order",
  "shop",
  "learnMore",
  "signUp",
  "call",
]).annotate({ identifier: "GoogleBusinessCallToAction" });

export type GoogleBusinessCallToAction =
  typeof GoogleBusinessCallToActionSchema.Type;

/**
 * The longest title of a Google Business Profile event or offer, in
 * characters (code points).
 */
export const maxGoogleBusinessTitleLength = 58;

/**
 * A day and a time on a Google Business Profile location's own clock, to
 * the minute, as `2026-11-27T09:00`.
 */
export const googleBusinessLocalTimePattern =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hours>\d{2}):(?<minutes>\d{2})$/u;

/**
 * A post on a Google Business Profile location: its description is the
 * post's text there.
 */
export const GoogleBusinessOptionsSchema = Schema.Struct({
  // A button under a standard post or an event; an offer shows Google's
  // own.
  callToAction: Schema.optionalKey(GoogleBusinessCallToActionSchema),
  // The http or https address the button opens: needed with every button
  // but `call`, which takes none.
  callToActionUrl: Schema.optionalKey(OptionTextSchema),
  // An offer's code, usable in store or online.
  couponCode: Schema.optionalKey(OptionTextSchema),
  // When an event or an offer ends, as `googleBusinessLocalTimePattern`,
  // after `startsAt`.
  endsAt: Schema.optionalKey(OptionTextSchema),
  platform: Schema.Literal("googleBusiness"),
  // Standard when left out.
  postType: Schema.optionalKey(GoogleBusinessPostTypeSchema),
  // The http or https address an offer is redeemed at.
  redeemUrl: Schema.optionalKey(OptionTextSchema),
  // When an event or an offer starts, as `googleBusinessLocalTimePattern`.
  startsAt: Schema.optionalKey(OptionTextSchema),
  // An offer's terms and conditions.
  terms: Schema.optionalKey(OptionTextSchema),
  // An event's or an offer's name: at most `maxGoogleBusinessTitleLength`
  // characters.
  title: Schema.optionalKey(OptionTextSchema),
}).annotate({
  description:
    "How a post goes out on a Google Business Profile location. An `event` or an `offer` needs `title`, `startsAt` and `endsAt`, on the location's own clock; only an `offer` takes `couponCode`, `redeemUrl` and `terms`.",
  identifier: "GoogleBusinessOptions",
});

export type GoogleBusinessOptions = typeof GoogleBusinessOptionsSchema.Type;

/**
 * What a post says on a channel that only its platform knows, tagged by
 * `platform`. Platforms without a member here take no options.
 */
export const TargetOptionsSchema = Schema.Union([
  YouTubeOptionsSchema,
  TikTokOptionsSchema,
  GoogleBusinessOptionsSchema,
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
