import { Match, Option, Result, Schema } from "effect";
import type { useTranslations } from "next-intl";
import {
  instagramCoverTypes,
  LinkedInMentionSchema,
  maxBlueskyLanguages,
  maxFacebookVideoTitleLength,
  maxGoogleBusinessTitleLength,
  maxInstagramAudioNameLength,
  maxInstagramCollaborators,
  maxInstagramCoverByteSize,
  maxLinkedInDocumentTitleLength,
  maxLinkedInLinkDescriptionLength,
  maxLinkedInLinkTitleLength,
  maxLinkedInLinkUrlLength,
  maxLinkedInMentions,
  maxPinterestLinkLength,
  maxMastodonContentWarningLength,
  maxPinterestTitleLength,
  maxThreadsLinkLength,
  maxThreadsTopicTagLength,
  maxTikTokPhotoTitleLength,
  maxYouTubeTagsLength,
  maxYouTubeThumbnailByteSize,
  maxYouTubeTitleLength,
  TargetOptionsSchema,
  youTubeThumbnailTypes,
} from "peal-contract";
import type {
  ChannelOptions,
  ContentViolation,
  LinkedInMention,
  MediaKind,
  OptionsPlatform,
  Platform,
  Post,
  TargetOptions,
} from "peal-contract";

import type { AttachedMedia } from "#posts/media-fit.ts";

// The options a post has on a channel whose platform takes some, as the
// composer shows them: a field description per platform, the values the
// member edits, and the options the API takes from them.

/**
 * The media a field is for: a post with a video among its media
 * (`video`), a post of images only (`photos`), or a post of one video
 * alone (`reel`, as Instagram makes it).
 */
export type MediaCondition = "photos" | "reel" | "video";

/**
 * The kinds of the post's media, in order, as the fields that follow them
 * read it; unknown (`undefined`) while they are read, which shows every
 * field.
 */
export type PostMediaKinds = readonly MediaKind[] | undefined;

/**
 * The kinds of the post's attachments, once each is read: unknown while
 * one is not, so every field shows until then.
 */
export const mediaKindsOf = (
  attached: readonly AttachedMedia[]
): PostMediaKinds => {
  const kinds = attached.flatMap(({ media }) =>
    Option.match(media, { onNone: () => [], onSome: ({ kind }) => [kind] })
  );

  return kinds.length === attached.length ? kinds : undefined;
};

/** Whether the post's media are those a field is for. */
export const matchesMedia = (
  condition: MediaCondition,
  media: readonly MediaKind[]
): boolean => {
  if (condition === "video") {
    return media.includes("video");
  }

  if (condition === "reel") {
    return media.length === 1 && media[0] === "video";
  }

  return media.length > 0 && media.every((kind) => kind === "image");
};

/** A message of the `Posts.Options` namespace. */
export type OptionsText = Parameters<
  ReturnType<typeof useTranslations<"Posts.Options">>
>[0];

interface Described {
  /** The option's name, as the API and its violations write it. */
  readonly name: string;
  readonly label: OptionsText;
  readonly hint?: OptionsText;
  /** Why the platform refuses the option's value (`optionInvalid`). */
  readonly invalid?: OptionsText;
  /**
   * The field shows, and its value is sent, only while the field named
   * `name` holds one of `values`, or nothing yet when `unset`: an event's
   * dates show once the post is an event. With `filled`, while that field
   * holds anything: sharing a community post shows once a community is
   * written.
   */
  readonly shownWith?:
    | {
        readonly name: string;
        readonly unset?: true;
        readonly values: readonly string[];
      }
    | { readonly filled: true; readonly name: string };
  /**
   * The field shows, and its value is sent, only on a post of these media:
   * a TikTok cover frame on a video, a reel's audio on one video.
   */
  readonly shownFor?: MediaCondition;
}

/**
 * One line of text; `maxLength` characters (code points) at most. With
 * `date`, a day, as `2026-11-27`.
 */
export interface TextField extends Described {
  readonly date?: true;
  readonly kind: "text";
  readonly maxLength?: number;
  readonly required?: true;
}

/**
 * A file of the workspace's library, by its id: one of `contentTypes`,
 * `maxByteSize` bytes at most.
 */
export interface MediaField extends Described {
  readonly contentTypes: readonly string[];
  readonly kind: "media";
  readonly maxByteSize: number;
}

/** Tags, typed separated by commas: `maximum` of them at most. */
export interface TagsField extends Described {
  readonly kind: "tags";
  readonly maximum: number;
}

/**
 * A day and a time on a clock that is not the reader's, to the minute, as
 * `2026-11-27T09:00`.
 */
export interface LocalTimeField extends Described {
  readonly kind: "localTime";
  readonly required?: true;
}

/**
 * One of `choices`, with nothing chosen at first. With `none`, a first
 * choice under that label chooses nothing again.
 */
export interface ChoiceField extends Described {
  readonly kind: "choice";
  readonly none?: OptionsText;
  readonly choices: readonly {
    readonly label: OptionsText;
    readonly value: string;
  }[];
  readonly required?: true;
}

/** Yes or no, with neither chosen at first. */
export interface YesNoField extends Described {
  readonly kind: "yesNo";
  readonly no: OptionsText;
  readonly required?: true;
  readonly yes: OptionsText;
}

/**
 * A box to tick, holding `initial` on a new target. `inverted` ticks it when
 * the option is false, as "Allow comments" shows `disableComment`. Under
 * `within`, it shows only while that toggle is ticked, and is cleared when
 * it is not.
 */
export interface ToggleField extends Described {
  readonly kind: "toggle";
  readonly initial: boolean;
  readonly inverted?: true;
  readonly within?: string;
}

/**
 * One of the values the account has, which a lookup reads from the
 * platform (`#posts/lookup-choices.ts`): a Pinterest account's boards.
 * Under `under`, it shows only once that field has a value, and is cleared
 * when that value changes, as a board's sections follow the board.
 */
export interface LookupField extends Described {
  /** What to say when the account has none of them. */
  readonly empty?: OptionsText;
  readonly kind: "lookup";
  readonly required?: true;
  readonly under?: string;
}

/** A whole number, `minimum` at least. */
export interface NumberField extends Described {
  readonly kind: "number";
  readonly minimum: number;
}

/**
 * The pages a LinkedIn post names, typed as `Name <urn>` and separated by
 * semicolons: each is linked where the text holds `@` and the name.
 */
export interface MentionsField extends Described {
  readonly kind: "mentions";
  /** The most pages one post names. */
  readonly maximum: number;
}

export type OptionField =
  | ChoiceField
  | LocalTimeField
  | LookupField
  | MediaField
  | NumberField
  | MentionsField
  | TagsField
  | TextField
  | ToggleField
  | YesNoField;

// A Google Business Profile event or offer, which has a title and dates.
const scheduled = { name: "postType", values: ["event", "offer"] } as const;

const offered = { name: "postType", values: ["offer"] } as const;

// A feed post, which a format left out is: the options of a feed post's
// show only on one.
const feedPost = { name: "format", unset: true, values: ["feed"] } as const;

// A Facebook post that has a title: a feed post's video, or a reel.
const titled = {
  name: "format",
  unset: true,
  values: ["feed", "reel"],
} as const;

// A Bluesky thread whose replies are limited to some.
const repliesLimited = { name: "replies", values: ["limited"] } as const;

/**
 * The fields of each platform that takes options, in the order the composer
 * shows them. A platform's options added to the contract need an entry here.
 */
export const optionFields = {
  bluesky: [
    {
      hint: "bluesky.languagesHint",
      invalid: "bluesky.languagesInvalid",
      kind: "tags",
      label: "bluesky.languages",
      maximum: maxBlueskyLanguages,
      name: "languages",
    },
    {
      choices: [
        { label: "bluesky.labelSexual", value: "sexual" },
        { label: "bluesky.labelNudity", value: "nudity" },
        { label: "bluesky.labelPorn", value: "porn" },
        { label: "bluesky.labelGraphicMedia", value: "graphic-media" },
      ],
      hint: "bluesky.contentLabelHint",
      kind: "choice",
      label: "bluesky.contentLabel",
      name: "contentLabel",
      none: "bluesky.labelNone",
    },
    {
      // Everyone, left out, is the first choice (`none`).
      choices: [
        { label: "bluesky.repliesNobody", value: "nobody" },
        { label: "bluesky.repliesLimited", value: "limited" },
      ],
      hint: "bluesky.repliesHint",
      invalid: "bluesky.repliesInvalid",
      kind: "choice",
      label: "bluesky.replies",
      name: "replies",
      none: "bluesky.repliesEveryone",
    },
    {
      initial: false,
      kind: "toggle",
      label: "bluesky.replyFollowers",
      name: "replyFollowers",
      shownWith: repliesLimited,
    },
    {
      initial: false,
      kind: "toggle",
      label: "bluesky.replyFollowing",
      name: "replyFollowing",
      shownWith: repliesLimited,
    },
    {
      initial: false,
      kind: "toggle",
      label: "bluesky.replyMentioned",
      name: "replyMentioned",
      shownWith: repliesLimited,
    },
    {
      hint: "bluesky.disableQuotesHint",
      initial: false,
      invalid: "bluesky.disableQuotesInvalid",
      kind: "toggle",
      label: "bluesky.disableQuotes",
      name: "disableQuotes",
    },
  ],
  facebook: [
    {
      // A feed post, left out, is the first choice (`none`).
      choices: [
        { label: "facebook.formatStory", value: "story" },
        { label: "facebook.formatReel", value: "reel" },
      ],
      hint: "facebook.formatHint",
      kind: "choice",
      label: "facebook.format",
      name: "format",
      none: "facebook.formatFeed",
    },
    {
      hint: "facebook.videoTitleHint",
      invalid: "facebook.videoTitleInvalid",
      kind: "text",
      label: "facebook.videoTitle",
      maxLength: maxFacebookVideoTitleLength,
      name: "videoTitle",
      shownFor: "video",
      shownWith: titled,
    },
  ],
  googleBusiness: [
    {
      choices: [
        { label: "googleBusiness.postTypeStandard", value: "standard" },
        { label: "googleBusiness.postTypeEvent", value: "event" },
        { label: "googleBusiness.postTypeOffer", value: "offer" },
      ],
      hint: "googleBusiness.postTypeHint",
      kind: "choice",
      label: "googleBusiness.postType",
      name: "postType",
    },
    {
      hint: "googleBusiness.titleHint",
      kind: "text",
      label: "googleBusiness.title",
      maxLength: maxGoogleBusinessTitleLength,
      name: "title",
      required: true,
      shownWith: scheduled,
    },
    {
      hint: "googleBusiness.startsAtHint",
      invalid: "googleBusiness.startsAtInvalid",
      kind: "localTime",
      label: "googleBusiness.startsAt",
      name: "startsAt",
      required: true,
      shownWith: scheduled,
    },
    {
      invalid: "googleBusiness.endsAtInvalid",
      kind: "localTime",
      label: "googleBusiness.endsAt",
      name: "endsAt",
      required: true,
      shownWith: scheduled,
    },
    {
      choices: [
        { label: "googleBusiness.actionBook", value: "book" },
        { label: "googleBusiness.actionOrder", value: "order" },
        { label: "googleBusiness.actionShop", value: "shop" },
        { label: "googleBusiness.actionLearnMore", value: "learnMore" },
        { label: "googleBusiness.actionSignUp", value: "signUp" },
        { label: "googleBusiness.actionCall", value: "call" },
      ],
      hint: "googleBusiness.callToActionHint",
      kind: "choice",
      label: "googleBusiness.callToAction",
      name: "callToAction",
      none: "googleBusiness.actionNone",
      // An offer shows Google's own button.
      shownWith: {
        name: "postType",
        unset: true,
        values: ["standard", "event"],
      },
    },
    {
      hint: "googleBusiness.linkHint",
      invalid: "googleBusiness.linkInvalid",
      kind: "text",
      label: "googleBusiness.callToActionUrl",
      name: "callToActionUrl",
      required: true,
      // The call button rings the location's own number.
      shownWith: {
        name: "callToAction",
        values: ["book", "order", "shop", "learnMore", "signUp"],
      },
    },
    {
      hint: "googleBusiness.couponCodeHint",
      kind: "text",
      label: "googleBusiness.couponCode",
      name: "couponCode",
      shownWith: offered,
    },
    {
      hint: "googleBusiness.linkHint",
      invalid: "googleBusiness.linkInvalid",
      kind: "text",
      label: "googleBusiness.redeemUrl",
      name: "redeemUrl",
      shownWith: offered,
    },
    {
      kind: "text",
      label: "googleBusiness.terms",
      name: "terms",
      shownWith: offered,
    },
  ],
  instagram: [
    {
      // A feed post, left out, is the first choice (`none`).
      choices: [{ label: "instagram.formatStory", value: "story" }],
      hint: "instagram.formatHint",
      kind: "choice",
      label: "instagram.format",
      name: "format",
      none: "instagram.formatFeed",
    },
    {
      hint: "instagram.shareToFeedHint",
      kind: "yesNo",
      label: "instagram.shareToFeed",
      name: "shareToFeed",
      no: "instagram.shareToFeedNo",
      shownFor: "reel",
      shownWith: feedPost,
      yes: "instagram.shareToFeedYes",
    },
    {
      contentTypes: instagramCoverTypes,
      hint: "instagram.coverHint",
      invalid: "instagram.coverInvalid",
      kind: "media",
      label: "instagram.cover",
      maxByteSize: maxInstagramCoverByteSize,
      name: "coverMediaId",
      shownFor: "reel",
      shownWith: feedPost,
    },
    {
      hint: "instagram.thumbOffsetHint",
      invalid: "instagram.thumbOffsetInvalid",
      kind: "number",
      label: "instagram.thumbOffset",
      minimum: 0,
      name: "thumbOffsetMs",
      shownFor: "reel",
      shownWith: feedPost,
    },
    {
      hint: "instagram.audioNameHint",
      invalid: "instagram.audioNameInvalid",
      kind: "text",
      label: "instagram.audioName",
      maxLength: maxInstagramAudioNameLength,
      name: "audioName",
      shownFor: "reel",
      shownWith: feedPost,
    },
    {
      choices: [
        { label: "instagram.trialReelManual", value: "manual" },
        { label: "instagram.trialReelPerformance", value: "performance" },
      ],
      hint: "instagram.trialReelHint",
      kind: "choice",
      label: "instagram.trialReel",
      name: "trialReel",
      none: "instagram.trialReelNone",
      shownFor: "reel",
      shownWith: feedPost,
    },
    {
      hint: "instagram.collaboratorsHint",
      invalid: "instagram.collaboratorsInvalid",
      kind: "tags",
      label: "instagram.collaborators",
      maximum: maxInstagramCollaborators,
      name: "collaborators",
      shownWith: feedPost,
    },
  ],
  linkedin: [
    {
      choices: [
        { label: "linkedin.visibilityPublic", value: "public" },
        { label: "linkedin.visibilityConnections", value: "connections" },
        { label: "linkedin.visibilityLoggedIn", value: "loggedIn" },
      ],
      hint: "linkedin.visibilityHint",
      kind: "choice",
      label: "linkedin.visibility",
      name: "visibility",
    },
    {
      initial: false,
      kind: "toggle",
      label: "linkedin.disableReshare",
      name: "disableReshare",
    },
    {
      hint: "linkedin.mentionsHint",
      invalid: "linkedin.mentionsInvalid",
      kind: "mentions",
      label: "linkedin.mentions",
      maximum: maxLinkedInMentions,
      name: "mentions",
    },
    {
      hint: "linkedin.linkUrlHint",
      invalid: "linkedin.linkUrlInvalid",
      kind: "text",
      label: "linkedin.linkUrl",
      maxLength: maxLinkedInLinkUrlLength,
      name: "linkUrl",
    },
    {
      hint: "linkedin.linkTitleHint",
      kind: "text",
      label: "linkedin.linkTitle",
      maxLength: maxLinkedInLinkTitleLength,
      name: "linkTitle",
    },
    {
      kind: "text",
      label: "linkedin.linkDescription",
      maxLength: maxLinkedInLinkDescriptionLength,
      name: "linkDescription",
    },
    {
      hint: "linkedin.documentTitleHint",
      invalid: "linkedin.documentTitleInvalid",
      kind: "text",
      label: "linkedin.documentTitle",
      maxLength: maxLinkedInDocumentTitleLength,
      name: "documentTitle",
    },
  ],
  mastodon: [
    {
      choices: [
        { label: "mastodon.visibilityPublic", value: "public" },
        { label: "mastodon.visibilityUnlisted", value: "unlisted" },
        { label: "mastodon.visibilityPrivate", value: "private" },
      ],
      hint: "mastodon.visibilityHint",
      kind: "choice",
      label: "mastodon.visibility",
      name: "visibility",
      none: "mastodon.accountDefault",
    },
    {
      hint: "mastodon.contentWarningHint",
      invalid: "mastodon.contentWarningInvalid",
      kind: "text",
      label: "mastodon.contentWarning",
      maxLength: maxMastodonContentWarningLength,
      name: "contentWarning",
    },
    {
      hint: "mastodon.sensitiveHint",
      kind: "yesNo",
      label: "mastodon.sensitive",
      name: "sensitive",
      no: "mastodon.sensitiveNo",
      yes: "mastodon.sensitiveYes",
    },
    {
      hint: "mastodon.languageHint",
      invalid: "mastodon.languageInvalid",
      kind: "text",
      label: "mastodon.language",
      name: "language",
    },
    {
      choices: [
        { label: "mastodon.quotePublic", value: "public" },
        { label: "mastodon.quoteFollowers", value: "followers" },
        { label: "mastodon.quoteNobody", value: "nobody" },
      ],
      hint: "mastodon.quotePolicyHint",
      invalid: "mastodon.quotePolicyInvalid",
      kind: "choice",
      label: "mastodon.quotePolicy",
      name: "quotePolicy",
      none: "mastodon.accountDefault",
      // Mastodon lets nobody quote a followers-only post.
      shownWith: {
        name: "visibility",
        unset: true,
        values: ["public", "unlisted"],
      },
    },
  ],
  pinterest: [
    {
      empty: "pinterest.boardEmpty",
      hint: "pinterest.boardHint",
      invalid: "pinterest.boardInvalid",
      kind: "lookup",
      label: "pinterest.board",
      name: "boardId",
      required: true,
    },
    {
      invalid: "pinterest.boardSectionInvalid",
      kind: "lookup",
      label: "pinterest.boardSection",
      name: "boardSectionId",
      under: "boardId",
    },
    {
      hint: "pinterest.titleHint",
      kind: "text",
      label: "pinterest.title",
      maxLength: maxPinterestTitleLength,
      name: "title",
    },
    {
      hint: "pinterest.linkHint",
      invalid: "pinterest.linkInvalid",
      kind: "text",
      label: "pinterest.link",
      maxLength: maxPinterestLinkLength,
      name: "link",
    },
    {
      hint: "pinterest.coverSecondHint",
      invalid: "pinterest.coverSecondInvalid",
      kind: "number",
      label: "pinterest.coverSecond",
      minimum: 0,
      name: "coverSecond",
    },
    {
      hint: "pinterest.dominantColorHint",
      invalid: "pinterest.dominantColorInvalid",
      kind: "text",
      label: "pinterest.dominantColor",
      name: "dominantColor",
    },
  ],
  threads: [
    {
      // Everyone, left out, is the first choice (`none`).
      choices: [
        { label: "threads.replyFollowing", value: "accounts_you_follow" },
        { label: "threads.replyFollowers", value: "followers_only" },
        { label: "threads.replyMentioned", value: "mentioned_only" },
        {
          label: "threads.replyAuthorOnly",
          value: "parent_post_author_only",
        },
      ],
      kind: "choice",
      label: "threads.replyControl",
      name: "replyControl",
      none: "threads.replyEveryone",
    },
    {
      hint: "threads.topicTagHint",
      invalid: "threads.topicTagInvalid",
      kind: "text",
      label: "threads.topicTag",
      maxLength: maxThreadsTopicTagLength,
      name: "topicTag",
    },
    {
      hint: "threads.linkAttachmentHint",
      invalid: "threads.linkAttachmentInvalid",
      kind: "text",
      label: "threads.linkAttachment",
      maxLength: maxThreadsLinkLength,
      name: "linkAttachment",
    },
  ],
  tiktok: [
    {
      choices: [
        { label: "tiktok.privacyPublic", value: "PUBLIC_TO_EVERYONE" },
        { label: "tiktok.privacyFriends", value: "MUTUAL_FOLLOW_FRIENDS" },
        { label: "tiktok.privacyFollowers", value: "FOLLOWER_OF_CREATOR" },
        { label: "tiktok.privacySelf", value: "SELF_ONLY" },
      ],
      kind: "choice",
      label: "tiktok.privacyLevel",
      name: "privacyLevel",
      required: true,
    },
    // TikTok asks that interactions stay off until the creator allows them.
    {
      initial: true,
      inverted: true,
      kind: "toggle",
      label: "tiktok.allowComment",
      name: "disableComment",
    },
    {
      initial: true,
      inverted: true,
      kind: "toggle",
      label: "tiktok.allowDuet",
      name: "disableDuet",
    },
    {
      initial: true,
      inverted: true,
      kind: "toggle",
      label: "tiktok.allowStitch",
      name: "disableStitch",
    },
    {
      hint: "tiktok.commercialContentHint",
      initial: false,
      invalid: "tiktok.commercialContentInvalid",
      kind: "toggle",
      label: "tiktok.commercialContent",
      name: "commercialContent",
    },
    {
      hint: "tiktok.brandOrganicHint",
      initial: false,
      kind: "toggle",
      label: "tiktok.brandOrganic",
      name: "brandOrganic",
      within: "commercialContent",
    },
    {
      hint: "tiktok.brandContentHint",
      initial: false,
      invalid: "tiktok.brandContentInvalid",
      kind: "toggle",
      label: "tiktok.brandContent",
      name: "brandContent",
      within: "commercialContent",
    },
    {
      initial: false,
      kind: "toggle",
      label: "tiktok.aiGenerated",
      name: "aiGenerated",
    },
    {
      hint: "tiktok.videoCoverHint",
      invalid: "tiktok.videoCoverInvalid",
      kind: "number",
      label: "tiktok.videoCover",
      minimum: 0,
      name: "videoCoverTimestampMs",
      shownFor: "video",
    },
    {
      hint: "tiktok.photoTitleHint",
      invalid: "tiktok.photoTitleInvalid",
      kind: "text",
      label: "tiktok.photoTitle",
      maxLength: maxTikTokPhotoTitleLength,
      name: "photoTitle",
      shownFor: "photos",
    },
    {
      hint: "tiktok.photoCoverHint",
      invalid: "tiktok.photoCoverInvalid",
      kind: "number",
      label: "tiktok.photoCover",
      minimum: 0,
      name: "photoCoverIndex",
      shownFor: "photos",
    },
    {
      // TikTok adds no music when it is left out.
      initial: false,
      kind: "toggle",
      label: "tiktok.autoAddMusic",
      name: "autoAddMusic",
      shownFor: "photos",
    },
  ],
  x: [
    {
      choices: [
        { label: "x.replyFollowing", value: "following" },
        { label: "x.replyMentioned", value: "mentionedUsers" },
        { label: "x.replySubscribers", value: "subscribers" },
        { label: "x.replyVerified", value: "verified" },
      ],
      hint: "x.replySettingsHint",
      kind: "choice",
      label: "x.replySettings",
      name: "replySettings",
      none: "x.replyEveryone",
    },
    {
      hint: "x.communityIdHint",
      invalid: "x.communityIdInvalid",
      kind: "text",
      label: "x.communityId",
      name: "communityId",
    },
    {
      initial: false,
      kind: "toggle",
      label: "x.shareWithFollowers",
      name: "shareWithFollowers",
      shownWith: { filled: true, name: "communityId" },
    },
    {
      hint: "x.paidPartnershipHint",
      initial: false,
      kind: "toggle",
      label: "x.paidPartnership",
      name: "paidPartnership",
    },
    {
      hint: "x.madeWithAiHint",
      initial: false,
      kind: "toggle",
      label: "x.madeWithAi",
      name: "madeWithAi",
    },
  ],
  youtube: [
    {
      hint: "youtube.titleHint",
      invalid: "youtube.titleInvalid",
      kind: "text",
      label: "youtube.title",
      maxLength: maxYouTubeTitleLength,
      name: "title",
      required: true,
    },
    {
      hint: "youtube.madeForKidsHint",
      kind: "yesNo",
      label: "youtube.madeForKids",
      name: "madeForKids",
      no: "youtube.madeForKidsNo",
      required: true,
      yes: "youtube.madeForKidsYes",
    },
    {
      choices: [
        { label: "youtube.privacyPublic", value: "public" },
        { label: "youtube.privacyUnlisted", value: "unlisted" },
        { label: "youtube.privacyPrivate", value: "private" },
      ],
      hint: "youtube.privacyHint",
      kind: "choice",
      label: "youtube.privacy",
      name: "privacy",
    },
    {
      hint: "youtube.tagsHint",
      invalid: "youtube.tagsInvalid",
      kind: "tags",
      label: "youtube.tags",
      // The contract takes as many tags as YouTube takes characters.
      maximum: maxYouTubeTagsLength,
      name: "tags",
    },
    {
      hint: "youtube.categoryIdHint",
      invalid: "youtube.categoryIdInvalid",
      kind: "text",
      label: "youtube.categoryId",
      name: "categoryId",
    },
    {
      initial: true,
      kind: "toggle",
      label: "youtube.notifySubscribers",
      name: "notifySubscribers",
    },
    {
      initial: false,
      kind: "toggle",
      label: "youtube.containsSyntheticMedia",
      name: "containsSyntheticMedia",
    },
    {
      contentTypes: youTubeThumbnailTypes,
      hint: "youtube.thumbnailHint",
      invalid: "youtube.thumbnailInvalid",
      kind: "media",
      label: "youtube.thumbnail",
      maxByteSize: maxYouTubeThumbnailByteSize,
      name: "thumbnailMediaId",
    },
    {
      choices: [
        { label: "youtube.licenseYouTube", value: "youtube" },
        { label: "youtube.licenseCreativeCommon", value: "creativeCommon" },
      ],
      hint: "youtube.licenseHint",
      kind: "choice",
      label: "youtube.license",
      name: "license",
      none: "youtube.channelDefault",
    },
    {
      hint: "youtube.embeddableHint",
      kind: "yesNo",
      label: "youtube.embeddable",
      name: "embeddable",
      no: "youtube.embeddableNo",
      yes: "youtube.embeddableYes",
    },
    {
      hint: "youtube.publicStatsViewableHint",
      kind: "yesNo",
      label: "youtube.publicStatsViewable",
      name: "publicStatsViewable",
      no: "youtube.publicStatsViewableNo",
      yes: "youtube.publicStatsViewableYes",
    },
    {
      hint: "youtube.defaultLanguageHint",
      invalid: "youtube.defaultLanguageInvalid",
      kind: "text",
      label: "youtube.defaultLanguage",
      name: "defaultLanguage",
    },
    {
      date: true,
      hint: "youtube.recordingDateHint",
      invalid: "youtube.recordingDateInvalid",
      kind: "text",
      label: "youtube.recordingDate",
      name: "recordingDate",
    },
  ],
} satisfies { readonly [P in OptionsPlatform]: readonly OptionField[] };

const fieldsByPlatform: ReadonlyMap<string, readonly OptionField[]> = new Map(
  Object.entries(optionFields)
);

const none: readonly OptionField[] = [];

/** The platform's fields, none if it takes no options. */
export const fieldsOf = (platform: Platform): readonly OptionField[] =>
  fieldsByPlatform.get(platform) ?? none;

/** The platform's field named `name`, if it has one. */
export const fieldOf = (
  platform: Platform,
  name: string
): Option.Option<OptionField> =>
  Option.fromUndefinedOr(
    fieldsOf(platform).find((field) => field.name === name)
  );

/**
 * What the member has filled in on one channel: text and tags as typed
 * (tags separated by commas, numbers as their digits), choices by their
 * value, yes or no and boxes as booleans. A field missing is not filled
 * in.
 */
export type OptionValues = Readonly<Record<string, boolean | string>>;

// One field's value, as an entry of the values.
const entry = (
  name: string,
  value: boolean | string
): readonly [string, boolean | string] => [name, value];

const MentionsSchema = Schema.Array(LinkedInMentionSchema);

const StoredValueSchema = Schema.Union([
  Schema.String,
  Schema.Boolean,
  Schema.Number,
  Schema.Array(Schema.String),
  MentionsSchema,
]);

// An option's value as the API holds it.
type StoredValue = typeof StoredValueSchema.Type;

const StoredSchema = Schema.Record(Schema.String, StoredValueSchema);

const decodeStored = Schema.decodeUnknownOption(StoredSchema);

const decodeText = Schema.decodeUnknownOption(Schema.String);

const decodeBoolean = Schema.decodeUnknownOption(Schema.Boolean);

const decodeTags = Schema.decodeUnknownOption(Schema.Array(Schema.String));

const decodeNumber = Schema.decodeUnknownOption(Schema.Number);

const wholeNumber = /^\d+$/u;

const decodeMentions = Schema.decodeUnknownOption(MentionsSchema);

const tagSeparator = ", ";

const mentionSeparator = "; ";

// A mention as typed: the page's name, then its URN between angle
// brackets.
const typedMention = /^(?<name>.+?)\s*<(?<urn>[^<>\s]+)>$/u;

/** The mentions as the field shows them: `Name <urn>; Name <urn>`. */
export const mentionsText = (mentions: readonly LinkedInMention[]): string =>
  mentions.map(({ name, urn }) => `${name} <${urn}>`).join(mentionSeparator);

/**
 * The mentions typed in the field. An entry without a URN between angle
 * brackets is kept with an empty one, so scheduling says the field is
 * wrong rather than dropping what was typed.
 */
export const mentionsOf = (typed: string): readonly LinkedInMention[] =>
  typed
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => {
      const groups = typedMention.exec(part)?.groups;

      return {
        name: (groups?.["name"] ?? part).trim(),
        urn: groups?.["urn"] ?? "",
      };
    });

// The value a stored option shows in its field.
const valueOf = (
  field: OptionField,
  stored: StoredValue | undefined
): Option.Option<boolean | string> =>
  Match.value(field).pipe(
    Match.discriminatorsExhaustive("kind")({
      choice: () => decodeText(stored),
      localTime: () => decodeText(stored),
      lookup: () => decodeText(stored),
      media: () => decodeText(stored),
      mentions: () => decodeMentions(stored).pipe(Option.map(mentionsText)),
      number: () => decodeNumber(stored).pipe(Option.map(String)),
      tags: () =>
        decodeTags(stored).pipe(Option.map((tags) => tags.join(tagSeparator))),
      text: () => decodeText(stored),
      toggle: () => decodeBoolean(stored),
      yesNo: () => decodeBoolean(stored),
    })
  );

// What a field holds on a new target: its box as it says, nothing else.
const initialOf = (field: OptionField): Option.Option<boolean | string> =>
  field.kind === "toggle" ? Option.some(field.initial) : Option.none();

/**
 * Whether the field shows with these values and the post's media: always,
 * or while the field it depends on, itself shown, holds one of the values
 * it shows with, and on the media it is for (every field while the media
 * are unknown).
 */
export const isShown = (
  platform: Platform,
  field: OptionField,
  values: OptionValues,
  media?: PostMediaKinds
): boolean => {
  const { shownFor, shownWith } = field;

  if (
    shownFor !== undefined &&
    media !== undefined &&
    !matchesMedia(shownFor, media)
  ) {
    return false;
  }

  if (shownWith === undefined) {
    return true;
  }

  const governing = fieldsOf(platform).find(
    ({ name }) => name === shownWith.name
  );

  if (governing !== undefined && !isShown(platform, governing, values, media)) {
    return false;
  }

  const held = values[shownWith.name];
  const empty = held === undefined || held === "";

  if ("filled" in shownWith) {
    return !empty;
  }

  return empty
    ? shownWith.unset === true
    : shownWith.values.some((value) => value === held);
};

/**
 * The values a target's stored options fill in. Boxes left out keep the
 * value the platform gives them when the option is left out, which is the
 * field's `initial`.
 */
export const valuesOf = (
  platform: Platform,
  options: TargetOptions | null
): OptionValues => {
  const stored = decodeStored(options ?? {}).pipe(
    Option.getOrElse((): typeof StoredSchema.Type => ({}))
  );

  return Object.fromEntries(
    fieldsOf(platform).flatMap((field) =>
      Option.match(
        valueOf(field, stored[field.name]).pipe(
          Option.orElse(() => initialOf(field))
        ),
        {
          onNone: () => [],
          onSome: (value) => [entry(field.name, value)],
        }
      )
    )
  );
};

/** What a new target starts with: every box as its field says. */
export const initialValues = (platform: Platform): OptionValues =>
  valuesOf(platform, null);

/** The values of a post's channels' options, by channel id. */
export type ValuesByChannel = Readonly<Record<string, OptionValues>>;

/** The values each of the post's targets has, by channel. */
export const valuesOfPost = (
  post: Post | undefined,
  platformOf: (channelId: string) => Option.Option<Platform>
): ValuesByChannel =>
  Object.fromEntries(
    (post?.targets ?? []).flatMap(({ channelId, options }) =>
      Option.match(platformOf(channelId), {
        onNone: () => [],
        onSome: (platform) =>
          fieldsOf(platform).length === 0
            ? []
            : [[channelId, valuesOf(platform, options)]],
      })
    )
  );

/**
 * The values with one field changed. A box under another is cleared when
 * that one is unticked, and a lookup under another emptied when that one
 * changes.
 */
export const withValue = (
  platform: Platform,
  values: OptionValues,
  name: string,
  value: boolean | string | undefined
): OptionValues => {
  const cleared = fieldsOf(platform).flatMap((field) =>
    field.kind === "toggle" && field.within === name && value !== true
      ? [field.name]
      : []
  );

  const emptied = new Set(
    fieldsOf(platform).flatMap((field) =>
      field.kind === "lookup" && field.under === name && values[name] !== value
        ? [field.name]
        : []
    )
  );

  const kept = Object.entries(values).filter(
    ([key]) => key !== name && !cleared.includes(key) && !emptied.has(key)
  );

  const changed = [
    ...(value === undefined ? [] : [entry(name, value)]),
    ...cleared.map((key) => entry(key, false)),
  ];

  return Object.fromEntries([...kept, ...changed]);
};

const tagsOf = (typed: string): readonly string[] =>
  typed
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");

/**
 * What is wrong with an option as the member filled it in, before any
 * request: more entries than the platform takes (`tooMany`), or a value
 * the API would refuse (`invalid`). The composer shows it under the field
 * and sends nothing until it is fixed.
 */
export type OptionProblem =
  | {
      readonly _tag: "tooMany";
      readonly count: number;
      readonly field: string;
      readonly maximum: number;
    }
  | { readonly _tag: "invalid"; readonly field: string };

type OptionValue =
  | boolean
  | number
  | string
  | readonly LinkedInMention[]
  | readonly string[];

// A field's value as the API takes it: none when it is not filled in, a
// problem when what is typed is no value of the field's kind.
const optionOf = (
  field: OptionField,
  value: boolean | string | undefined
): Result.Result<Option.Option<OptionValue>, OptionProblem> => {
  if (value === undefined || value === "") {
    return Result.succeed(Option.none());
  }

  const typed = decodeText(value).pipe(Option.getOrElse(() => ""));
  const invalid: OptionProblem = { _tag: "invalid", field: field.name };

  // Digits only: anything else is not a number the API would take.
  if (field.kind === "number") {
    const number = Number(typed.trim());

    return wholeNumber.test(typed.trim()) && Number.isSafeInteger(number)
      ? Result.succeed(Option.some(number))
      : Result.fail(invalid);
  }

  if (field.kind === "mentions" || field.kind === "tags") {
    const entries =
      field.kind === "mentions" ? mentionsOf(typed) : tagsOf(typed);

    if (entries.length > field.maximum) {
      return Result.fail({
        _tag: "tooMany",
        count: entries.length,
        field: field.name,
        maximum: field.maximum,
      });
    }

    return Result.succeed(
      entries.length === 0 ? Option.none() : Option.some(entries)
    );
  }

  return Result.succeed(Option.some(value));
};

const decodeOptions = Schema.decodeUnknownOption(TargetOptionsSchema);

// The fields the values fill in, as the API takes them, or what is wrong
// with each that the contract would refuse: every field is checked alone,
// so one wrong field never hides the others.
const filledOf = (
  platform: Platform,
  values: OptionValues,
  media: PostMediaKinds
): Result.Result<
  readonly (readonly [string, OptionValue])[],
  readonly OptionProblem[]
> => {
  const filled: (readonly [string, OptionValue])[] = [];
  const problems: OptionProblem[] = [];

  for (const field of fieldsOf(platform)) {
    if (isShown(platform, field, values, media)) {
      const option = optionOf(field, values[field.name]);

      if (Result.isFailure(option)) {
        problems.push(option.failure);
      } else if (Option.isSome(option.success)) {
        const given = option.success.value;

        if (Option.isSome(decodeOptions({ [field.name]: given, platform }))) {
          filled.push([field.name, given]);
        } else {
          problems.push({ _tag: "invalid", field: field.name });
        }
      }
    }
  }

  return problems.length === 0 ? Result.succeed(filled) : Result.fail(problems);
};

/**
 * The options the values give on a channel of the platform, as the API
 * takes them, none on a platform that takes no options; or, when the
 * contract would refuse some field as filled in, what is wrong with each.
 * Never none for options that were filled in. A field the post's `media`
 * hide is not sent; without them, every field is.
 */
export const optionsOf = (
  platform: Platform,
  values: OptionValues,
  media?: PostMediaKinds
): Result.Result<Option.Option<TargetOptions>, readonly OptionProblem[]> =>
  filledOf(platform, values, media).pipe(
    Result.flatMap((filled) => {
      const options = decodeOptions({
        ...Object.fromEntries(filled),
        platform,
      });

      if (Option.isSome(options) || fieldsOf(platform).length === 0) {
        return Result.succeed(options);
      }

      // Each field passed alone: the problem is between them.
      return Result.fail(
        filled.map(([field]): OptionProblem => ({ _tag: "invalid", field }))
      );
    })
  );

/** What is wrong with the values on a channel of the platform, by field. */
export const problemsByField = (
  platform: Platform,
  values: OptionValues,
  media?: PostMediaKinds
): ReadonlyMap<string, OptionProblem> =>
  new Map(
    Result.match(optionsOf(platform, values, media), {
      onFailure: (problems) =>
        problems.map((problem) => [problem.field, problem] as const),
      onSuccess: () => [],
    })
  );

/** A problem with one of the options filled in on a channel. */
export type ChannelOptionProblem = OptionProblem & {
  readonly channelId: string;
};

/** What the composer has of the options of its channels. */
export interface ChannelOptionsState {
  /**
   * The options to send, on each channel where the member chose one at
   * least.
   */
  readonly options: readonly ChannelOptions[];
  /** What is wrong with what was filled in: nothing is sent until fixed. */
  readonly problems: readonly ChannelOptionProblem[];
}

// What leaving the options out gives on a new target, as the fields show
// it with the post's media: every box shown as its field says.
const leftOutOf = (platform: Platform, media: PostMediaKinds): string =>
  JSON.stringify(
    optionsOf(platform, initialValues(platform), media).pipe(
      Result.getOrElse(() => Option.none<TargetOptions>()),
      Option.getOrUndefined
    )
  );

// Whether the options choose anything leaving them out does not give.
const chooses = (
  platform: Platform,
  options: Option.Option<TargetOptions>,
  media: PostMediaKinds
): options is Option.Some<TargetOptions> =>
  Option.isSome(options) &&
  JSON.stringify(options.value) !== leftOutOf(platform, media);

/**
 * The options of the post on each of these channels whose platform takes
 * some and where the member chose one at least, and what is wrong with
 * those filled in. A channel where nothing was chosen gets no entry, so a
 * new post takes the channel's default options, as it does through the
 * API. A field the post's `media` hide is not sent. A channel in `settled`
 * (whose AI label the member, or a preset, chose) sends its options
 * whatever they hold, so a label turned off is kept as off.
 */
export const channelOptionsOf = (
  channels: readonly { readonly id: string; readonly platform: Platform }[],
  values: ValuesByChannel,
  media?: PostMediaKinds,
  settled: ReadonlySet<string> = new Set()
): ChannelOptionsState => {
  const options: ChannelOptions[] = [];
  const problems: ChannelOptionProblem[] = [];

  for (const { id, platform } of channels) {
    const given = optionsOf(
      platform,
      values[id] ?? initialValues(platform),
      media
    );

    if (Result.isFailure(given)) {
      problems.push(
        ...given.failure.map((problem) => ({ ...problem, channelId: id }))
      );
    } else if (
      Option.isSome(given.success) &&
      (settled.has(id) || chooses(platform, given.success, media))
    ) {
      options.push({ channelId: id, options: given.success.value });
    }
  }

  return { options, problems };
};

/** A violation about one option of a channel. */
export type OptionViolation = Extract<
  ContentViolation,
  { readonly _tag: "optionInvalid" | "optionMissing" | "optionTooLong" }
>;

/** The violations about the channel's options, by field. */
export const violationsByField = (
  violations: readonly ContentViolation[],
  channelId: string
): ReadonlyMap<string, OptionViolation> => {
  const byField = new Map<string, OptionViolation>();

  for (const violation of violations) {
    if (
      (violation._tag === "optionInvalid" ||
        violation._tag === "optionMissing" ||
        violation._tag === "optionTooLong") &&
      violation.channelId === channelId
    ) {
      byField.set(violation.field, violation);
    }
  }

  return byField;
};
