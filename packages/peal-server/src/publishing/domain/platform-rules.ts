import type { Platform } from "#shared/domain/platform.ts";

import type { MediaContentType } from "./media-file.ts";
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
  readonly maxMentions?: number;
  readonly media?: MediaRules;
  /** The platform publishes images and videos only, never text alone. */
  readonly mediaRequired: boolean;
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
// - Google Business Profile: a local post's `summary` takes 1,500
//   characters, the count Google's own editor shows (its reference names
//   no limit). How many photos one post takes is not stated either.
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

export const platformRules: Readonly<Record<Platform, PlatformRules>> = {
  bluesky: {
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
      mixesKinds: true,
      showsAltText: false,
    },
    mediaRequired: true,
    textLimits: [{ maximum: 2200, unit: "codePoints" }],
  },
  linkedin: {
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
