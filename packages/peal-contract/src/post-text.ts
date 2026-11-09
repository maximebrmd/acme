import { Schema } from "effect";

import type { MediaContentType } from "./media.ts";
import type { Platform } from "./platform.ts";
import { xLinksIn } from "./x-links.ts";

// The rules the API applies to a post's text and media before it schedules
// it, so clients count as the server does: a composer shows how much room is
// left on each platform, and which images or videos it would refuse. The
// server's rules (src/publishing/domain/text-length.ts and platform-rules.ts)
// are the source; a test keeps the two equal.

/** The most text a post keeps, in UTF-16 code units. */
export const maxPostTextLength = 65_536;

/** The most alt text an attachment keeps. */
export const maxAltTextLength = 5000;

/** The most images and videos a post holds. */
export const maxMediaPerPost = 20;

/**
 * How a platform measures text: graphemes (what a reader sees as one
 * character), Unicode code points, UTF-8 bytes, code points with each emoji
 * counted by its UTF-8 bytes (Threads), UTF-16 code units (TikTok), or X's
 * weighted count, where a link counts as 23 (`peal.social` too), an emoji as
 * 2, and a code point outside Latin, Greek, Cyrillic and common punctuation
 * as 2, once the text is normalized to NFC.
 */
export const TextUnitSchema = Schema.Literals([
  "graphemes",
  "codePoints",
  "utf8Bytes",
  "emojiBytes",
  "utf16Units",
  "weighted",
]).annotate({
  description: "How a platform measures the length of a post's text.",
  identifier: "TextUnit",
});

export type TextUnit = typeof TextUnitSchema.Type;

const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

const segmentsOf = (text: string): readonly string[] =>
  Array.from(graphemes.segment(text), ({ segment }) => segment);

const codePointsOf = (text: string): readonly number[] =>
  Array.from(text, (character) => character.codePointAt(0) ?? 0);

const utf8Length = (codePoint: number): number => {
  if (codePoint < 0x80) {
    return 1;
  }

  if (codePoint < 0x8_00) {
    return 2;
  }

  return codePoint < 0x1_00_00 ? 3 : 4;
};

const singleWeightRanges: readonly (readonly [number, number])[] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

const codePointWeight = (codePoint: number): number =>
  singleWeightRanges.some(
    ([first, last]) => codePoint >= first && codePoint <= last
  )
    ? 1
    : 2;

/** What X counts a link as, however long it is. */
export const weightedLinkLength = 23;

const emojiWeight = 2;

const emoji = /^\p{RGI_Emoji}$/v;

// The emoji X counts as 2 each, whatever they are built of, found as
// twitter-text finds them: the longest at each place, a keycap without its
// variation selector too ("1⃣"). The list is Unicode's current one
// (`RGI_Emoji`), on purpose: twitter-text 3.1.0 carries a 2019 list, which
// lacks some ZWJ sequences and counts them by code point (🧑🏽‍💻 and 👁️‍🗨️ as
// 5, where Peal counts 2), and X's own composer counts by a newer one. A
// post near 280 made of such sequences is the only text the two can tell
// apart; X's answer then wins, as for any refusal.
const emojis = /\p{RGI_Emoji}|[#*0-9]\u20E3/gv;

const codePointsWeight = (text: string): number =>
  codePointsOf(text).reduce(
    (weight, codePoint) => weight + codePointWeight(codePoint),
    0
  );

const weightOf = (text: string): number => {
  let length = 0;
  let from = 0;

  for (const match of text.matchAll(emojis)) {
    length += codePointsWeight(text.slice(from, match.index)) + emojiWeight;
    from = match.index + match[0].length;
  }

  return length + codePointsWeight(text.slice(from));
};

const weightedLength = (text: string): number => {
  const normalized = text.normalize("NFC");
  let length = 0;
  let from = 0;

  for (const link of xLinksIn(normalized)) {
    length += weightOf(normalized.slice(from, link.start)) + weightedLinkLength;
    from = link.end;
  }

  return length + weightOf(normalized.slice(from));
};

const utf8BytesOf = (text: string): number =>
  codePointsOf(text).reduce(
    (bytes, codePoint) => bytes + utf8Length(codePoint),
    0
  );

const emojiBytesLength = (text: string): number =>
  segmentsOf(text).reduce(
    (length, segment) =>
      length +
      (emoji.test(segment)
        ? utf8BytesOf(segment)
        : codePointsOf(segment).length),
    0
  );

const measures: Readonly<Record<TextUnit, (text: string) => number>> = {
  codePoints: (text) => codePointsOf(text).length,
  emojiBytes: emojiBytesLength,
  graphemes: (text) => segmentsOf(text).length,
  utf16Units: (text) => text.length,
  utf8Bytes: utf8BytesOf,
  weighted: weightedLength,
};

/** The length of `text` in `unit`. */
export const measureText = (text: string, unit: TextUnit): number =>
  measures[unit](text);

const hashtags = /(?<![\p{L}\p{N}_&#])#[\p{L}\p{N}_]*\p{L}[\p{L}\p{N}_]*/gu;

const mentions = /(?<![\p{L}\p{N}_@])@[\p{L}\p{N}_.]*[\p{L}\p{N}_]/gu;

/** How many hashtags the text holds, such as "#launch". */
export const countHashtags = (text: string): number =>
  [...text.matchAll(hashtags)].length;

/** How many accounts the text mentions, such as "@peal_example". */
export const countMentions = (text: string): number =>
  [...text.matchAll(mentions)].length;

/**
 * How many different links the text holds, each as X finds them (see
 * `./x-links.ts`): with or without a scheme, on a known top-level domain,
 * without the punctuation that ends a sentence. The same link twice counts
 * once.
 */
export const countLinks = (text: string): number =>
  new Set(xLinksIn(text).map(({ url }) => url)).size;

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
 * What a platform accepts in one post, as far as the API checks. A platform
 * without `media` has no media rule the API knows.
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
  /** Every limit applies. */
  readonly textLimits: readonly TextLimit[];
}

const mebibyte = 1024 * 1024;

const second = 1000;

const minute = 60 * second;

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
  pinterest: { mediaRequired: false, textLimits: [] },
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
  // One video alone; one of 3 minutes or less, square or taller than wide,
  // becomes a Short.
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
