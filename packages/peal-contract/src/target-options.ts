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

/** The longest title Pinterest takes, in characters (code points). */
export const maxPinterestTitleLength = 100;

/** The longest link Pinterest takes, in characters (code points). */
export const maxPinterestLinkLength = 2048;

/**
 * A Pin on a Pinterest account: its description is the post's text there,
 * and its alt text the first file's.
 */
export const PinterestOptionsSchema = Schema.Struct({
  // Required to schedule: the id of the board the Pin is saved to, from
  // the `pinterestBoards` lookup. Digits.
  boardId: Schema.optionalKey(OptionTextSchema),
  // A section of that board, from the `pinterestBoardSections` lookup.
  boardSectionId: Schema.optionalKey(OptionTextSchema),
  // The second of a video its cover is taken at: 0, the first frame, when
  // left out; the last frame when the video is shorter.
  coverSecond: Schema.optionalKey(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
  ),
  // The colour Pinterest shows while the image loads, as "#6E7874".
  dominantColor: Schema.optionalKey(OptionTextSchema),
  // Where people land when they click the Pin: an http or https address
  // of at most `maxPinterestLinkLength` characters.
  link: Schema.optionalKey(OptionTextSchema),
  platform: Schema.Literal("pinterest"),
  // At most `maxPinterestTitleLength` characters.
  title: Schema.optionalKey(OptionTextSchema),
}).annotate({
  description:
    "How a post goes out on a Pinterest account, as a Pin. Scheduling needs `boardId`.",
  identifier: "PinterestOptions",
});

export type PinterestOptions = typeof PinterestOptionsSchema.Type;

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
 * The longest content warning Peal takes on a Mastodon post, in characters
 * (code points): Peal's ceiling. Mastodon counts the warning in the
 * post's character limit with the text (`countedText`).
 */
export const maxMastodonContentWarningLength = 500;

/**
 * Who sees a Mastodon post: the account's own default when left out. A
 * private mention (`direct`) is not offered.
 */
export const MastodonVisibilitySchema = Schema.Literals([
  "public",
  "unlisted",
  "private",
]).annotate({ identifier: "MastodonVisibility" });

export type MastodonVisibility = typeof MastodonVisibilitySchema.Type;

/** Who may quote a Mastodon post: the account's own default when left out. */
export const MastodonQuotePolicySchema = Schema.Literals([
  "public",
  "followers",
  "nobody",
]).annotate({ identifier: "MastodonQuotePolicy" });

export type MastodonQuotePolicy = typeof MastodonQuotePolicySchema.Type;

/**
 * A post on a Mastodon account: its status is the post's text there. Each
 * option applies to every part of a thread.
 */
export const MastodonOptionsSchema = Schema.Struct({
  // Shown before the text, which is folded behind it: one line of at most
  // `maxMastodonContentWarningLength` characters, counted in the text's
  // limit.
  contentWarning: Schema.optionalKey(OptionTextSchema),
  // An ISO 639-1 code, two or three lower-case letters, as "fr". The
  // account's default posting language when left out.
  language: Schema.optionalKey(OptionTextSchema),
  platform: Schema.Literal("mastodon"),
  // Taken only with `visibility` public or unlisted: Mastodon lets nobody
  // quote a followers-only post. Servers before Mastodon 4.5 ignore it.
  quotePolicy: Schema.optionalKey(MastodonQuotePolicySchema),
  // Marks the post and its media as sensitive. The account's default when
  // left out; a content warning marks it sensitive whatever this says.
  sensitive: Schema.optionalKey(Schema.Boolean),
  visibility: Schema.optionalKey(MastodonVisibilitySchema),
}).annotate({
  description:
    "How a post goes out on a Mastodon account, on every part of a thread. Scheduling needs none of them; a content warning counts in the text's limit.",
  identifier: "MastodonOptions",
});

export type MastodonOptions = typeof MastodonOptionsSchema.Type;

/** The most languages a Bluesky post names. */
export const maxBlueskyLanguages = 3;

/**
 * A label the author puts on what a Bluesky post shows. A part without
 * media is sent without it.
 */
export const BlueskyContentLabelSchema = Schema.Literals([
  "sexual",
  "nudity",
  "porn",
  "graphic-media",
]).annotate({ identifier: "BlueskyContentLabel" });

export type BlueskyContentLabel = typeof BlueskyContentLabelSchema.Type;

/**
 * Who may reply to a Bluesky thread: everyone when left out, nobody, or
 * those its `reply…` options name (`limited`).
 */
export const BlueskyRepliesSchema = Schema.Literals([
  "everyone",
  "nobody",
  "limited",
]).annotate({ identifier: "BlueskyReplies" });

export type BlueskyReplies = typeof BlueskyRepliesSchema.Type;

/**
 * A post on a Bluesky account: its record's text is the post's text there.
 * Who may reply is the thread's; the others apply to every part.
 */
export const BlueskyOptionsSchema = Schema.Struct({
  // Labels the media of each part that has any.
  contentLabel: Schema.optionalKey(BlueskyContentLabelSchema),
  // Keeps each part from being quoted. False when left out. Needs the
  // channel to have granted its scope.
  disableQuotes: Schema.optionalKey(Schema.Boolean),
  // The languages of the text: at most `maxBlueskyLanguages` BCP 47 tags,
  // as "en" or "pt-BR".
  languages: Schema.optionalKey(
    Schema.Array(OptionTextSchema).check(
      Schema.isMaxLength(maxBlueskyLanguages)
    )
  ),
  platform: Schema.Literal("bluesky"),
  // Who may reply to the thread. Anything but everyone needs the channel to
  // have granted its scope.
  replies: Schema.optionalKey(BlueskyRepliesSchema),
  // With `replies` limited, one of them at least: the author's followers,
  // the accounts the author follows, the accounts the post mentions.
  replyFollowers: Schema.optionalKey(Schema.Boolean),
  replyFollowing: Schema.optionalKey(Schema.Boolean),
  replyMentioned: Schema.optionalKey(Schema.Boolean),
}).annotate({
  description:
    "How a post goes out on a Bluesky account. Scheduling needs none of them; `replies` limited needs one of `replyFollowers`, `replyFollowing` and `replyMentioned`, and the two gates (`replies`, `disableQuotes`) a channel connected since Peal asks for their scopes.",
  identifier: "BlueskyOptions",
});

export type BlueskyOptions = typeof BlueskyOptionsSchema.Type;

/** The longest topic a Threads post takes, in characters (code points). */
export const maxThreadsTopicTagLength = 50;

/**
 * The longest link a Threads post's attachment takes, in characters (code
 * points): Peal's ceiling.
 */
export const maxThreadsLinkLength = 2048;

/** Who may reply to a Threads post: everyone when left out. */
export const ThreadsReplyControlSchema = Schema.Literals([
  "everyone",
  "accounts_you_follow",
  "mentioned_only",
  "parent_post_author_only",
  "followers_only",
]).annotate({ identifier: "ThreadsReplyControl" });

export type ThreadsReplyControl = typeof ThreadsReplyControlSchema.Type;

/** A post on a Threads account: its text is the post's text there. */
export const ThreadsOptionsSchema = Schema.Struct({
  // The https address Threads previews under a post of text alone: refused
  // on a post with media.
  linkAttachment: Schema.optionalKey(OptionTextSchema),
  platform: Schema.Literal("threads"),
  replyControl: Schema.optionalKey(ThreadsReplyControlSchema),
  // The post's one topic: at most `maxThreadsTopicTagLength` characters,
  // without "." or "&".
  topicTag: Schema.optionalKey(OptionTextSchema),
}).annotate({
  description:
    "How a post goes out on a Threads account. Scheduling needs none of them; `linkAttachment` is for a post without media.",
  identifier: "ThreadsOptions",
});

export type ThreadsOptions = typeof ThreadsOptionsSchema.Type;

/** Who may reply to an X post, besides its author: everyone when left out. */
export const XReplySettingsSchema = Schema.Literals([
  "following",
  "mentionedUsers",
  "subscribers",
  "verified",
]).annotate({ identifier: "XReplySettings" });

export type XReplySettings = typeof XReplySettingsSchema.Type;

/**
 * A post on an X account: its text is the post's text there. Who may
 * reply, the community and sharing it go with a thread's first post; the
 * disclosures label every part, the AI one each part with media.
 */
export const XOptionsSchema = Schema.Struct({
  // The community the post goes to: digits, as X gives its id.
  communityId: Schema.optionalKey(OptionTextSchema),
  // Discloses AI-generated media. False when left out.
  madeWithAi: Schema.optionalKey(Schema.Boolean),
  // Labels the post as a paid promotion. False when left out.
  paidPartnership: Schema.optionalKey(Schema.Boolean),
  platform: Schema.Literal("x"),
  replySettings: Schema.optionalKey(XReplySettingsSchema),
  // Shows a community post on the followers' timelines too: needs
  // `communityId`. False when left out.
  shareWithFollowers: Schema.optionalKey(Schema.Boolean),
}).annotate({
  description:
    "How a post goes out on an X account. Scheduling needs none of them; `shareWithFollowers` needs `communityId`.",
  identifier: "XOptions",
});

export type XOptions = typeof XOptionsSchema.Type;

/**
 * The text a platform's character limit counts on a channel, with the
 * options the post has there: the text itself, but on Mastodon, which
 * counts a content warning with it, the warning then the text, on every
 * part. The server's `countedText` is the source.
 */
export const countedText = (
  text: string,
  options: TargetOptions | undefined
): string =>
  options?.platform === "mastodon" && options.contentWarning !== undefined
    ? `${options.contentWarning}${text}`
    : text;

/**
 * What a post says on a channel that only its platform knows, tagged by
 * `platform`. Platforms without a member here take no options.
 */
export const TargetOptionsSchema = Schema.Union([
  YouTubeOptionsSchema,
  TikTokOptionsSchema,
  PinterestOptionsSchema,
  GoogleBusinessOptionsSchema,
  LinkedInOptionsSchema,
  MastodonOptionsSchema,
  BlueskyOptionsSchema,
  ThreadsOptionsSchema,
  XOptionsSchema,
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
