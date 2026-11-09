import { Schema } from "effect";

import type { MediaContentType } from "./media.ts";
import type { Platform } from "./platform.ts";

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
 * counted by its UTF-8 bytes (Threads), or X's weighted count, where a link
 * counts as 23, an emoji as 2, and a code point outside Latin, Greek,
 * Cyrillic and common punctuation as 2.
 */
export const TextUnitSchema = Schema.Literals([
  "graphemes",
  "codePoints",
  "utf8Bytes",
  "emojiBytes",
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

const links = /(?<![\p{L}\p{N}@])(?:https?:\/\/|www\.)[^\s<>"]+/giu;

const trailingPunctuation = /[.,;:!?'")\]}]+$/u;

const withoutLinks = (text: string) => {
  let rest = "";
  let count = 0;
  let from = 0;

  for (const match of text.matchAll(links)) {
    const link = match[0].replace(trailingPunctuation, "");

    rest += text.slice(from, match.index);
    count += 1;
    from = match.index + link.length;
  }

  return { links: count, rest: rest + text.slice(from) };
};

const weightedLength = (text: string): number => {
  const { links: linkCount, rest } = withoutLinks(text.normalize("NFC"));

  return segmentsOf(rest).reduce(
    (length, segment) =>
      length +
      (emoji.test(segment)
        ? emojiWeight
        : codePointsOf(segment).reduce(
            (weight, codePoint) => weight + codePointWeight(codePoint),
            0
          )),
    linkCount * weightedLinkLength
  );
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

/** How many accounts the text mentions, such as "@acme_example". */
export const countMentions = (text: string): number =>
  [...text.matchAll(mentions)].length;

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
  /** Width times height. */
  readonly maxPixels?: number;
  readonly minDurationMs?: number;
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
  readonly maxHashtags?: number;
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

const instagramVideo: FormatLimits = {
  aspectRatio: { maximum: 10, minimum: 0.01 },
  maxByteSize: 300 * mebibyte,
  maxDurationMs: 15 * minute,
  minDurationMs: 3 * second,
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
  tiktok: { mediaRequired: false, textLimits: [] },
  x: {
    maxMedia: 4,
    media: {
      formats: {
        "image/gif": { maxByteSize: 15 * mebibyte },
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
  youtube: { mediaRequired: false, textLimits: [] },
};
