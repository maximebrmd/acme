import { Option } from "effect";

import { connectionOf } from "#shared/domain/channel-connection.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { Platform } from "#shared/domain/platform.ts";

import type { MediaContentType } from "./media-file.ts";
import { postFormatOf } from "./post-format.ts";
import type { PostFormat } from "./post-format.ts";
import { maxFollowUps } from "./post-part.ts";
import type { TargetOptions } from "./target-options.ts";
import type { TextUnit } from "./text-length.ts";

/** At most `maximum` of `unit`. */
export interface TextLimit {
  readonly maximum: number;
  readonly unit: TextUnit;
}

/** Width divided by height, both bounds included. */
export interface AspectRatioRange {
  readonly maximum: number;
  readonly minimum: number;
}

/** What a platform takes of one file type. */
export interface FormatLimits {
  readonly aspectRatio?: AspectRatioRange;
  readonly maxByteSize?: number;
  readonly maxDurationMs?: number;
  /** The most files a post holding one of this type shows (X: a GIF alone). */
  readonly maxMediaWith?: number;
  /** Width times height. */
  readonly maxPixels?: number;
  readonly minByteSize?: number;
  readonly minDurationMs?: number;
  /** Each of width and height, in pixels, both bounds included. */
  readonly sideRange?: SideRange;
}

/** The fewest and most pixels a side may have. */
export interface SideRange {
  readonly maximum: number;
  readonly minimum: number;
}

/** What a platform takes of a post's images and videos. */
export interface MediaRules {
  /** The file types it takes, each with its limits; it refuses the others. */
  readonly formats: Readonly<Partial<Record<MediaContentType, FormatLimits>>>;
  /** The longest alt text it keeps for one image or video, in code points. */
  readonly maxAltTextLength?: number;
  readonly maxVideos?: number;
  /** One post can show images and videos together. */
  readonly mixesKinds: boolean;
  /** It shows the alt text of each image or video to people who need it. */
  readonly showsAltText: boolean;
}

/**
 * What the parts after a post's first become on a platform: replies in a
 * `thread`, each to the part before it, or `comment`s under the post.
 */
export type FollowUpKind = "comment" | "thread";

/**
 * What a comment under a post holds, where the parts after the first are
 * comments: a comment is no post, so it follows these rules in place of
 * the platform's. Text alone, within every limit: Peal sends no file with
 * a comment.
 */
export interface CommentRules {
  readonly textLimits: readonly TextLimit[];
}

/**
 * The parts a platform takes after a post's first. In a thread each
 * follows the rules of a post there: its text, its media, their limits; a
 * comment follows `comment`'s.
 */
export interface FollowUpRules {
  /** What each part holds, where they are comments; left out on a thread. */
  readonly comment?: CommentRules;
  readonly kind: FollowUpKind;
  /** The most parts after the first. */
  readonly maximum: number;
}

/**
 * How long a platform keeps a poll open: any whole number of minutes
 * between two bounds, or as long as the platform decides, whatever the
 * post asks (Threads sets no duration).
 */
export type PollDuration =
  | {
      readonly _tag: "range";
      readonly maximumMinutes: number;
      readonly minimumMinutes: number;
    }
  | { readonly _tag: "platformDecides" };

/**
 * The poll a platform takes with a post, its first part's text as its
 * question: how many choices, how long each is, how long it stays open,
 * and whether readers may pick several. Peal sends a poll with no file:
 * every such platform refuses them together.
 */
export interface PollRules {
  readonly choiceLimit: TextLimit;
  readonly duration: PollDuration;
  readonly maxChoices: number;
  readonly minChoices: number;
  readonly multipleChoice: boolean;
}

/**
 * What a post format (`./post-format.ts`: a story, a reel) changes of its
 * platform's rules. Its media rules, its count of files, whether it needs
 * one and the parts it takes replace the platform's whole: a format left
 * without `followUps` takes no parts, and one without `media` has no media
 * rule Peal knows.
 */
export interface PostFormatRules {
  readonly followUps?: FollowUpRules;
  readonly maxMedia?: number;
  readonly media?: MediaRules;
  readonly mediaRequired: boolean;
  /**
   * The platform publishes the post's text with it. A story is sent
   * without: its text is neither counted nor checked there.
   */
  readonly sendsText: boolean;
}

/**
 * What a platform accepts in one post, as far as Peal checks before
 * publishing. A limit left out is one Peal does not know yet: the platform
 * may still refuse the post when it goes out. So is every media rule of a
 * platform without `media`.
 */
export interface PlatformRules {
  /** Characters the platform refuses anywhere in the text (YouTube: < and >). */
  readonly forbiddenCharacters?: readonly string[];
  readonly maxHashtags?: number;
  /** Different links, counted by `countLinks`. */
  readonly maxLinks?: number;
  readonly maxMedia?: number;
  /**
   * The parts a post may have after its first, and what they become there.
   * Left out where the platform takes a post alone.
   */
  readonly followUps?: FollowUpRules;
  readonly maxMentions?: number;
  readonly media?: MediaRules;
  /** The platform publishes images and videos only, never text alone. */
  readonly mediaRequired: boolean;
  /**
   * The kinds of post whose rules differ from a feed post's there, by the
   * name the options' `format` gives them. Left out where it has none.
   */
  readonly postFormats?: Readonly<Record<string, PostFormatRules>>;
  /**
   * False where the post goes out without its text (a story's rules, as
   * `rulesFor` answers them). Left out, the text is sent.
   */
  readonly sendsText?: boolean;
  /**
   * The poll it takes with a post (`./poll.ts`). Left out where Peal
   * sends none: the platform has none, or Peal does not send it yet.
   */
  readonly poll?: PollRules;
  /** Every limit applies: Bluesky counts graphemes and bytes. */
  readonly textLimits: readonly TextLimit[];
}

const mebibyte = 1024 * 1024;

const second = 1000;

const minute = 60 * second;

// From the platforms' own references:
//
// - Bluesky: the post record's text has at most 300 graphemes and 3,000
//   bytes; at most 4 images.
// - Mastodon: the instance's `max_characters`, 500 by default, and its
//   `max_media_attachments`, 4 in the reference. Until channels keep their
//   instance's settings, the defaults apply.
// - LinkedIn: 3,000 characters of commentary (not confirmed by LinkedIn's
//   reference, which only names FIELD_LENGTH_TOO_LONG); 20 images.
// - X: 280 by the weighted count; 4 images.
// - Threads: 500 characters, each emoji counting its UTF-8 bytes, and 5
//   different links at most; carousels of up to 20 items.
// - Instagram: captions of 2,200 characters, 30 hashtags and 20 mentions;
//   no post without an image or a video; carousels of up to 20 items.
// - Facebook Pages: 63,206 characters, the figure commonly reported (Meta's
//   reference names no limit for `message`); how many photos one post
//   attaches is not known yet.
// - TikTok: a video's caption takes 2,200 UTF-16 code units (Direct
//   Post's `title`). A photo post's description takes 4,000, but Peal holds
//   it to the caption's 2,200, so a post's text fits whichever it becomes;
//   up to 35 photos. TikTok publishes nothing without media.
// - YouTube: the video's description, at most 5,000 bytes, without "<" or
//   ">"; no post without its one video.
// - Pinterest: a Pin's description, at most 800 characters (pins/create);
//   no Pin without an image or a video; up to 5 images, a carousel.
// - Google Business Profile: a local post's `summary` is held to 1,500
//   characters, the figure commonly reported for Google's editor. Google's
//   own pages name none (the localPosts reference, "Description/body of
//   the local post", and Business Profile Help's page on posts, as read in
//   November 2026). How many photos one post takes is not stated either.
//
// "Characters" with no other word count code points, the stricter reading.
//
// Their media, from the same references. Where a platform writes "MB", the
// limit is read as mebibytes, the larger reading, so Peal never refuses a
// file the platform takes:
//
// - Bluesky: JPEG, PNG, GIF and WebP images of up to 2,000,000 bytes; one
//   MP4 video of up to 300,000,000 bytes and 3 minutes; never images and a
//   video together.
// - Mastodon: the instance's `media_attachments` settings, with the defaults
//   until channels keep them: images of up to 16 MiB and 33,177,600 pixels;
//   one video, MP4 or QuickTime, of up to 99 MiB and 8,294,400 pixels, never
//   with images; descriptions of up to 1,500 characters.
// - LinkedIn: JPEG, PNG and GIF images of up to 36,152,320 pixels; one MP4
//   video of 3 seconds to 30 minutes and 75 KB to 500 MB (75 KB read as
//   75,000 bytes, the smaller reading), never with images; alt text of up
//   to 4,086 characters; or one PDF document of up to 100 MB (and 300
//   pages, which the media library checks), alone.
// - X: JPEG, PNG and WebP images of up to 5 MB, GIFs of up to 15 MB; one
//   video, MP4 or QuickTime, of 0.5 to 140 seconds and up to 512 MB, never
//   with images; a GIF alone too; alt text of up to 1,000 characters.
// - Threads: JPEG and PNG images of up to 8 MB, at most 10:1 either way;
//   MP4 and QuickTime videos of up to 1 GB and 5 minutes, from 1:100 to
//   10:1; carousels mix them; alt text of up to 1,000 characters.
// - Instagram: JPEG images of up to 8 MB, from 4:5 to 1.91:1; MP4 and
//   QuickTime videos of 3 seconds to 15 minutes and up to 300 MB, from 1:100
//   to 10:1; carousels mix them. Whether it shows alt text is not known yet.
// - Facebook Pages: JPEG, PNG and GIF photos of up to 10 MB (Page Photos,
//   which also lists BMP and TIFF, formats Peal does not take), with alt
//   text; one MP4 or QuickTime video, never with photos, whose limits
//   Meta's reference does not give.
// - TikTok (Media Transfer Guide): one MP4 or QuickTime video (WebM too,
//   which Peal does not take) of up to 4 GB and 10 minutes, each side from
//   360 to 4,096 pixels, at 23 to 60 frames a second (which Peal does not
//   probe: TikTok checks it); or up to 35 JPEG and WebP photos of up to
//   20 MB, at most 1080p, read as 1920 × 1080 pixels; never both. TikTok
//   keeps no alt text. How long a creator's videos may be is theirs
//   (`max_video_post_duration_sec`), checked against TikTok when the post
//   is scheduled.
// - YouTube: one video, MP4 or QuickTime, of up to 256 GB and 12 hours,
//   alone (channels Google has not verified take 15 minutes at most, which
//   only YouTube knows). A video of 3 minutes or less that is square or
//   taller than wide becomes a Short.
// - Pinterest (pins/create, and its product specs): JPEG and PNG images of
//   up to 20 MB, one alone or 2 to 5 as a carousel; or one video, MP4 or
//   QuickTime, of 4 seconds to 15 minutes and up to 2 GB, taller than
//   1.91:1 and shorter than 1:2, never with images. A Pin has one alt text
//   of up to 500 characters, the first file's. Pinterest asks carousel
//   images to be square or 2:3, which it checks itself.
// - Google Business Profile: JPEG and PNG photos of 10,240 bytes (the
//   MediaItem reference) to 5 MB (Business Profile's photo guidelines),
//   which Google fetches from a public URL. The API takes no video in a
//   local post ("only photos are supported"), and keeps no alt text. A
//   photo's shorter side must have 250 pixels at least, which Peal does not
//   check: Google refuses a smaller one when the post goes out.
const blueskyImage: FormatLimits = { maxByteSize: 2_000_000 };

const mastodonImage: FormatLimits = {
  maxByteSize: 16 * mebibyte,
  maxPixels: 33_177_600,
};

const mastodonVideo: FormatLimits = {
  maxByteSize: 99 * mebibyte,
  maxPixels: 8_294_400,
};

const linkedinImage: FormatLimits = { maxPixels: 36_152_320 };

const xImage: FormatLimits = { maxByteSize: 5 * mebibyte };

const xVideo: FormatLimits = {
  maxByteSize: 512 * mebibyte,
  maxDurationMs: 140 * second,
  minDurationMs: 500,
};

const threadsImage: FormatLimits = {
  aspectRatio: { maximum: 10, minimum: 0.1 },
  maxByteSize: 8 * mebibyte,
};

const threadsVideo: FormatLimits = {
  aspectRatio: { maximum: 10, minimum: 0.01 },
  maxByteSize: 1024 * mebibyte,
  maxDurationMs: 5 * minute,
};

const facebookImage: FormatLimits = { maxByteSize: 10 * mebibyte };

const youtubeVideo: FormatLimits = {
  maxByteSize: 256 * 1024 * mebibyte,
  maxDurationMs: 12 * 60 * minute,
};

const instagramVideo: FormatLimits = {
  aspectRatio: { maximum: 10, minimum: 0.01 },
  maxByteSize: 300 * mebibyte,
  maxDurationMs: 15 * minute,
  minDurationMs: 3 * second,
};

const tiktokImage: FormatLimits = {
  maxByteSize: 20 * mebibyte,
  maxPixels: 1920 * 1080,
};

const tiktokVideo: FormatLimits = {
  maxByteSize: 4096 * mebibyte,
  maxDurationMs: 10 * minute,
  sideRange: { maximum: 4096, minimum: 360 },
};

const googleBusinessImage: FormatLimits = {
  maxByteSize: 5 * mebibyte,
  minByteSize: 10_240,
};

const pinterestImage: FormatLimits = { maxByteSize: 20 * mebibyte };

const pinterestVideo: FormatLimits = {
  aspectRatio: { maximum: 1.91, minimum: 0.5 },
  maxByteSize: 2048 * mebibyte,
  maxDurationMs: 15 * minute,
  minDurationMs: 4 * second,
};

// Post formats, from Meta's references (read 2026-11-12):
//
// - Instagram story (the IG User Media reference,
//   https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media):
//   `media_type=STORIES`, one image or video; an image "Format: JPEG",
//   "File size: 8 MB maximum", 9:16 recommended and no ratio stated, which
//   Peal reads as the video's range; a video "MOV or MP4", "60 seconds
//   maximum" and "3 seconds minimum", "File size: 100MB maximum",
//   "between 0.1:1 and 10:1". `alt_text`: "Reels and stories are not
//   supported." No caption is sent.
// - Facebook Page story (the Page Stories API,
//   https://developers.facebook.com/docs/page-stories-api): photos
//   ".jpeg, .bmp, .png, .gif, .tiff" that "can not exceed 10MB" (BMP and
//   TIFF Peal does not take); a video ".mp4 (recommended)", "9 x 16",
//   "Minimum is 540 x 960 pixels", "A video story can not exceed 60
//   seconds", and 3 seconds at least as for reels. No text is listed.
// - Facebook reel (the Reels Publishing API,
//   https://developers.facebook.com/docs/video-api/guides/reels-publishing):
//   one video, "9 x 16", "Minimum is 540 x 960 pixels", "3 to 90 seconds";
//   the post's text is its `description`. MP4, as the page's examples.
//
// 9:16 is read as a ratio from 0.5 to 0.6, and 540 by 960 as 540 pixels on
// each side at least; Meta names no largest side, and 8,192 is Peal's
// ceiling. Neither page gives a size for a video, nor does Peal. Both ask
// 24 to 60 frames a second, which Peal does not read: Meta refuses a video
// outside it when the post goes out.
const verticalVideo: FormatLimits = {
  aspectRatio: { maximum: 0.6, minimum: 0.5 },
  minDurationMs: 3 * second,
  sideRange: { maximum: 8192, minimum: 540 },
};

const instagramStoryVideo: FormatLimits = {
  aspectRatio: { maximum: 10, minimum: 0.1 },
  maxByteSize: 100 * mebibyte,
  maxDurationMs: 60 * second,
  minDurationMs: 3 * second,
};

const instagramStory: PostFormatRules = {
  maxMedia: 1,
  media: {
    formats: {
      "image/jpeg": {
        aspectRatio: { maximum: 10, minimum: 0.1 },
        maxByteSize: 8 * mebibyte,
      },
      "video/mp4": instagramStoryVideo,
      "video/quicktime": instagramStoryVideo,
    },
    maxVideos: 1,
    mixesKinds: false,
    showsAltText: false,
  },
  mediaRequired: true,
  sendsText: false,
};

const facebookStory: PostFormatRules = {
  maxMedia: 1,
  media: {
    formats: {
      "image/gif": { maxByteSize: 10 * mebibyte },
      "image/jpeg": { maxByteSize: 10 * mebibyte },
      "image/png": { maxByteSize: 10 * mebibyte },
      "video/mp4": { ...verticalVideo, maxDurationMs: 60 * second },
    },
    maxVideos: 1,
    mixesKinds: false,
    showsAltText: false,
  },
  mediaRequired: true,
  sendsText: false,
};

const facebookReel: PostFormatRules = {
  maxMedia: 1,
  media: {
    formats: { "video/mp4": { ...verticalVideo, maxDurationMs: 90 * second } },
    maxVideos: 1,
    mixesKinds: false,
    showsAltText: false,
  },
  mediaRequired: true,
  sendsText: true,
};

// Polls, from the platforms' references (read 2026-11-14):
//
// - X (docs.x.com/x-api/posts/create-post, `CreatePostsPoll`): `poll`
//   with `options`, 2 to 4 of "1-25 characters each", and
//   `duration_minutes` from 5 to 10,080; no multiple choice. The page
//   names no rule between a poll and media; X has refused them together
//   in one post, and Peal sends neither with the other.
// - Mastodon (docs.joinmastodon.org/methods/statuses): `poll[options][]`,
//   `poll[expires_in]` in seconds, `poll[multiple]`; "If media_ids[] is
//   provided, poll cannot be used". The instance's `configuration.polls`
//   bounds it, by default 4 options of 50 characters, open from 300 to
//   2,629,746 seconds: until channels keep their instance's settings, the
//   defaults apply, as for the text.
// - Threads (developers.facebook.com/documentation/threads/create-posts/
//   polls): `poll_attachment`, `option_a` to `option_d`, 2 to 4 of 1 to 25
//   characters, "only to text-only posts"; no duration is set.
//
// LinkedIn's poll (the Poll Post API) has a question of its own beside
// the post's text and four durations, Instagram's a caption add-on through
// Facebook Login only: neither is sent yet. Bluesky, Facebook Pages and
// YouTube document none.
const shortChoices = { maximum: 25, unit: "codePoints" } as const;

// The platforms with threads: a reply chain, as long as a post has parts.
const thread: FollowUpRules = { kind: "thread", maximum: maxFollowUps };

// The platforms where the account comments under its own post once it is
// live, a first comment, with the call the inbox answers comments with
// (read 2026-11-14): Facebook Pages' `POST /{object-id}/comments`
// (developers.facebook.com/docs/graph-api/reference/object/comments/),
// Instagram's `POST /{ig-media-id}/comments` (…/instagram-graph-api/
// reference/ig-media/comments), LinkedIn's `POST /rest/socialActions/
// {postUrn}/comments` as the page (learn.microsoft.com/…/shares/
// comments-api) and YouTube's `commentThreads.insert`
// (developers.google.com/youtube/v3/docs/commentThreads/insert). None of
// those pages states a length for a comment (YouTube names only its
// `commentTextTooLong` error), so a comment is held to the platform's
// limits on a post's text, which never makes a comment the platform would
// refuse for its length shorter than what Peal lets through, as the inbox
// holds its replies. Text alone: Instagram and YouTube document no file
// on a comment, LinkedIn's page contradicts itself on images.
const firstComment = (textLimits: readonly TextLimit[]): FollowUpRules => ({
  comment: { textLimits },
  kind: "comment",
  maximum: 1,
});

export const platformRules: Readonly<Record<Platform, PlatformRules>> = {
  bluesky: {
    followUps: thread,
    maxMedia: 4,
    media: {
      formats: {
        "image/gif": blueskyImage,
        "image/jpeg": blueskyImage,
        "image/png": blueskyImage,
        "image/webp": blueskyImage,
        "video/mp4": { maxByteSize: 300_000_000, maxDurationMs: 3 * minute },
      },
      maxVideos: 1,
      mixesKinds: false,
      showsAltText: true,
    },
    mediaRequired: false,
    textLimits: [
      { maximum: 300, unit: "graphemes" },
      { maximum: 3000, unit: "utf8Bytes" },
    ],
  },
  facebook: {
    followUps: firstComment([{ maximum: 63_206, unit: "codePoints" }]),
    media: {
      formats: {
        "image/gif": facebookImage,
        "image/jpeg": facebookImage,
        "image/png": facebookImage,
        "video/mp4": {},
        "video/quicktime": {},
      },
      maxVideos: 1,
      mixesKinds: false,
      showsAltText: true,
    },
    mediaRequired: false,
    postFormats: { reel: facebookReel, story: facebookStory },
    textLimits: [{ maximum: 63_206, unit: "codePoints" }],
  },
  googleBusiness: {
    media: {
      formats: {
        "image/jpeg": googleBusinessImage,
        "image/png": googleBusinessImage,
      },
      mixesKinds: false,
      showsAltText: false,
    },
    mediaRequired: false,
    textLimits: [{ maximum: 1500, unit: "codePoints" }],
  },
  instagram: {
    followUps: firstComment([{ maximum: 2200, unit: "codePoints" }]),
    maxHashtags: 30,
    maxMedia: 20,
    maxMentions: 20,
    media: {
      formats: {
        "image/jpeg": {
          aspectRatio: { maximum: 1.91, minimum: 0.8 },
          maxByteSize: 8 * mebibyte,
        },
        "video/mp4": instagramVideo,
        "video/quicktime": instagramVideo,
      },
      // "Alternative text, up to 1000 character, for an image": images
      // and a carousel's images, never a reel (the IG User Media
      // reference, read 2026-11-11).
      maxAltTextLength: 1000,
      mixesKinds: true,
      showsAltText: true,
    },
    mediaRequired: true,
    postFormats: { story: instagramStory },
    textLimits: [{ maximum: 2200, unit: "codePoints" }],
  },
  linkedin: {
    followUps: firstComment([{ maximum: 3000, unit: "codePoints" }]),
    maxMedia: 20,
    media: {
      formats: {
        // A document, shown page by page, is the post's only file.
        "application/pdf": { maxByteSize: 100 * mebibyte, maxMediaWith: 1 },
        "image/gif": linkedinImage,
        "image/jpeg": linkedinImage,
        "image/png": linkedinImage,
        "video/mp4": {
          maxByteSize: 500 * mebibyte,
          maxDurationMs: 30 * minute,
          minByteSize: 75_000,
          minDurationMs: 3 * second,
        },
      },
      maxAltTextLength: 4086,
      maxVideos: 1,
      mixesKinds: false,
      showsAltText: true,
    },
    mediaRequired: false,
    textLimits: [{ maximum: 3000, unit: "codePoints" }],
  },
  mastodon: {
    poll: {
      choiceLimit: { maximum: 50, unit: "codePoints" },
      duration: { _tag: "range", maximumMinutes: 43_829, minimumMinutes: 5 },
      maxChoices: 4,
      minChoices: 2,
      multipleChoice: true,
    },
    followUps: thread,
    maxMedia: 4,
    media: {
      formats: {
        "image/gif": mastodonImage,
        "image/jpeg": mastodonImage,
        "image/png": mastodonImage,
        "image/webp": mastodonImage,
        "video/mp4": mastodonVideo,
        "video/quicktime": mastodonVideo,
      },
      maxAltTextLength: 1500,
      maxVideos: 1,
      mixesKinds: false,
      showsAltText: true,
    },
    mediaRequired: false,
    textLimits: [{ maximum: 500, unit: "codePoints" }],
  },
  pinterest: {
    maxMedia: 5,
    media: {
      formats: {
        "image/jpeg": pinterestImage,
        "image/png": pinterestImage,
        "video/mp4": pinterestVideo,
        "video/quicktime": pinterestVideo,
      },
      maxAltTextLength: 500,
      maxVideos: 1,
      mixesKinds: false,
      showsAltText: true,
    },
    mediaRequired: true,
    textLimits: [{ maximum: 800, unit: "codePoints" }],
  },
  threads: {
    poll: {
      choiceLimit: shortChoices,
      duration: { _tag: "platformDecides" },
      maxChoices: 4,
      minChoices: 2,
      multipleChoice: false,
    },
    maxLinks: 5,
    maxMedia: 20,
    media: {
      formats: {
        "image/jpeg": threadsImage,
        "image/png": threadsImage,
        "video/mp4": threadsVideo,
        "video/quicktime": threadsVideo,
      },
      maxAltTextLength: 1000,
      mixesKinds: true,
      showsAltText: true,
    },
    mediaRequired: false,
    textLimits: [{ maximum: 500, unit: "emojiBytes" }],
  },
  tiktok: {
    maxMedia: 35,
    media: {
      formats: {
        "image/jpeg": tiktokImage,
        "image/webp": tiktokImage,
        "video/mp4": tiktokVideo,
        "video/quicktime": tiktokVideo,
      },
      maxVideos: 1,
      mixesKinds: false,
      showsAltText: false,
    },
    mediaRequired: true,
    textLimits: [{ maximum: 2200, unit: "utf16Units" }],
  },
  x: {
    poll: {
      choiceLimit: shortChoices,
      duration: { _tag: "range", maximumMinutes: 10_080, minimumMinutes: 5 },
      maxChoices: 4,
      minChoices: 2,
      multipleChoice: false,
    },
    followUps: thread,
    maxMedia: 4,
    media: {
      formats: {
        "image/gif": { maxByteSize: 15 * mebibyte, maxMediaWith: 1 },
        "image/jpeg": xImage,
        "image/png": xImage,
        "image/webp": xImage,
        "video/mp4": xVideo,
        "video/quicktime": xVideo,
      },
      maxAltTextLength: 1000,
      maxVideos: 1,
      mixesKinds: false,
      showsAltText: true,
    },
    mediaRequired: false,
    textLimits: [{ maximum: 280, unit: "weighted" }],
  },
  youtube: {
    followUps: firstComment([{ maximum: 5000, unit: "utf8Bytes" }]),
    forbiddenCharacters: ["<", ">"],
    maxMedia: 1,
    media: {
      formats: { "video/mp4": youtubeVideo, "video/quicktime": youtubeVideo },
      maxVideos: 1,
      mixesKinds: false,
      showsAltText: false,
    },
    mediaRequired: true,
    textLimits: [{ maximum: 5000, unit: "utf8Bytes" }],
  },
};

// The platform's rules with a format's in place of its own. Each field the
// format leaves out is gone, as a format replaces them whole.
const withFormat = (
  {
    followUps: _followUps,
    maxMedia: _maxMedia,
    media: _media,
    postFormats: _postFormats,
    ...base
  }: PlatformRules,
  format: PostFormatRules
): PlatformRules => ({ ...base, ...format });

/**
 * The rules of a post of `format` on the platform, or none where the
 * platform has no such format.
 */
export const formatRulesOn = (
  platform: Platform,
  format: PostFormat
): PlatformRules | undefined => {
  const rules = platformRules[platform];
  const chosen = rules.postFormats?.[format];

  return chosen === undefined ? undefined : withFormat(rules, chosen);
};

/**
 * The rules a post follows on the platform with the options it has there:
 * those of the format the options choose (`postFormatOf`: a story, a
 * reel), or the platform's own, the same object, for a feed post, for
 * options of another platform and on a platform without formats.
 */
export const rulesFor = (
  platform: Platform,
  options: Option.Option<TargetOptions>
): PlatformRules =>
  options.pipe(
    Option.filter((chosen) => chosen.platform === platform),
    postFormatOf,
    Option.flatMapNullishOr((format) => formatRulesOn(platform, format)),
    Option.getOrElse(() => platformRules[platform])
  );

/**
 * The parts the platform takes after a post's first, if it takes any,
 * with the options the post has there: a format takes none.
 */
export const followUpsOn = (
  platform: Platform,
  options: Option.Option<TargetOptions> = Option.none()
): FollowUpRules | undefined => rulesFor(platform, options).followUps;

/**
 * The parts the platform takes after a post's first on a channel that
 * came in through `connection`: a LinkedIn profile takes none, as its
 * comments would need a member's permission Peal does not ask for (a
 * company page comments as the page). A channel stored without a
 * connection came the platform's first way in (`connectionOf`).
 */
export const followUpsThrough = (
  platform: Platform,
  connection: Option.Option<ChannelConnection>,
  options: Option.Option<TargetOptions> = Option.none()
): FollowUpRules | undefined =>
  platform === "linkedin" &&
  !Option.contains(connectionOf(platform, connection), "linkedinPage")
    ? undefined
    : followUpsOn(platform, options);

/**
 * The rules a part after the first follows on the platform, with the
 * options the post has there: a post's (`rulesFor`) in a thread, and a
 * comment's where the parts are comments: its text's limits, no file.
 */
export const partRulesFor = (
  platform: Platform,
  options: Option.Option<TargetOptions> = Option.none()
): PlatformRules => {
  const rules = rulesFor(platform, options);
  const comment = rules.followUps?.comment;

  return comment === undefined
    ? rules
    : { maxMedia: 0, mediaRequired: false, textLimits: comment.textLimits };
};
