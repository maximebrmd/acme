import { Schema } from "effect";

import type { MediaContentType } from "./media.ts";
import type { Platform } from "./platform.ts";
import type { TargetOptions } from "./target-options.ts";
import { xLinksIn } from "./x-links.ts";

export { xLinksIn } from "./x-links.ts";

export type { XLink } from "./x-links.ts";

// The rules the API applies to a post's text and media before it schedules
// it, so clients count as the server does: a composer shows how much room is
// left on each platform, and which images or videos it would refuse. The
// server's rules (src/publishing/domain/text-length.ts and platform-rules.ts)
// are the source; a test keeps the two equal.

/** The most text a post keeps, in UTF-16 code units. */
export const maxPostTextLength = 65_536;

/** The most alt text an attachment keeps. */
export const maxAltTextLength = 5000;

/** The most images and videos a post, or one of its parts, holds. */
export const maxMediaPerPost = 20;

/** The most parts that follow a post's first: 25 parts in all. */
export const maxFollowUps = 24;

/** The longest wait before a part, in seconds: a day. */
export const maxPartDelaySeconds = 86_400;

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
 * What the parts after a post's first become on a platform: replies in a
 * `thread`, each to the part before it, or `comment`s under the post.
 */
export type FollowUpKind = "comment" | "thread";

/**
 * The parts a platform takes after a post's first. Each follows the rules
 * of a post there: its text, its media, their limits.
 */
export interface FollowUpRules {
  readonly kind: FollowUpKind;
  /** The most parts after the first. */
  readonly maximum: number;
}

/**
 * What a post format (a story, a reel) changes of its platform's rules:
 * its media rules, its count of files, whether it needs one and the parts
 * it takes replace the platform's whole, so a format without `followUps`
 * takes no parts. `sendsText` false: the post goes out without its text,
 * which is neither counted nor checked there.
 */
export interface PostFormatRules {
  readonly followUps?: FollowUpRules;
  readonly maxMedia?: number;
  readonly media?: MediaRules;
  readonly mediaRequired: boolean;
  readonly sendsText: boolean;
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
   * name the options' `format` gives them (`rulesFor` picks them).
   */
  readonly postFormats?: Readonly<Record<string, PostFormatRules>>;
  /** False where the post goes out without its text; left out, it is sent. */
  readonly sendsText?: boolean;
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

// Stories and reels, from Meta's references (the server's platform rules
// cite each page): one file each; a story sends no text.
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

// The platforms with threads: a reply chain, as long as a post has parts.
const thread: FollowUpRules = { kind: "thread", maximum: maxFollowUps };

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

/**
 * The format the options choose on their platform (`story`, `reel`), or
 * none for a feed post, whether `feed` is chosen or nothing is.
 */
export const postFormatOf = (
  platform: Platform,
  options: TargetOptions | undefined
): string | undefined =>
  options?.platform === platform &&
  (options.platform === "instagram" || options.platform === "facebook") &&
  options.format !== undefined &&
  options.format !== "feed"
    ? options.format
    : undefined;

/**
 * The rules a post follows on the platform with the options it has there:
 * those of the format they choose, which replace the platform's media
 * rules, count of files and parts whole, or the platform's own for a feed
 * post, for options of another platform and on a platform without
 * formats. The server's `rulesFor` is the source.
 */
export const rulesFor = (
  platform: Platform,
  options: TargetOptions | undefined
): PlatformRules => {
  const rules = platformRules[platform];
  const name = postFormatOf(platform, options);
  const format = name === undefined ? undefined : rules.postFormats?.[name];

  if (format === undefined) {
    return rules;
  }

  const {
    followUps: _followUps,
    maxMedia: _maxMedia,
    media: _media,
    postFormats: _postFormats,
    ...base
  } = rules;

  return { ...base, ...format };
};

/** What a server's short addresses look like: its base, then a code. */
export interface ShortAddresses {
  /** The base, ending in `/`, as `shortLinks.status` answers it. */
  readonly base: string;
  /** How many characters a code has. */
  readonly codeLength: number;
}

/** Where a link stands in a text, in UTF-16 offsets. */
export interface LinkPlace {
  readonly end: number;
  readonly start: number;
}

/** A distinct address a post's text goes out with shortened. */
export interface LinkToShorten {
  readonly address: string;
  readonly places: readonly LinkPlace[];
}

/** The longest address the server shortens, written as its redirect writes it (`URL.href`). */
export const maxShortenedLinkLength = 2048;

/**
 * The platforms whose posts take their links as written, never shortened:
 * Pinterest, whose help page "Blocked links and websites"
 * (https://help.pinterest.com/en/articles/blocked-links-and-websites,
 * read 2026-11-12) says "we don't allow certain redirects or URL
 * shorteners"; Instagram and TikTok, whose captions make no link
 * clickable, so a short address would only be less readable and could
 * count no click.
 */
const linksAsWritten: ReadonlySet<Platform> = new Set([
  "pinterest",
  "instagram",
  "tiktok",
]);

/** Whether a platform's posts take their links as written. */
export const keepsLinksAsWritten = (platform: Platform): boolean =>
  linksAsWritten.has(platform);

/**
 * The hosts of each platform's own pages: a link to one is left as
 * written on a channel of that platform, which shows it natively (a post
 * of X quoted, a video of YouTube played), where a short address would
 * hide it. Mastodon's servers are many, and Google Business Profile's
 * local posts link out: neither has hosts here.
 */
const ownHosts: Readonly<Record<Platform, readonly string[]>> = {
  bluesky: ["bsky.app"],
  facebook: ["facebook.com", "fb.com", "fb.me", "fb.watch"],
  googleBusiness: [],
  instagram: ["instagram.com"],
  linkedin: ["linkedin.com", "lnkd.in"],
  mastodon: [],
  pinterest: ["pinterest.com", "pin.it"],
  threads: ["threads.net", "threads.com"],
  tiktok: ["tiktok.com"],
  x: ["x.com", "twitter.com"],
  youtube: ["youtube.com", "youtu.be"],
};

// Whether the address is on one of the platform's own hosts, or under one.
const isOwnLink = (address: string, platform: Platform): boolean => {
  const host = URL.parse(address)?.hostname.toLowerCase();

  return (
    host !== undefined &&
    ownHosts[platform].some((own) => host === own || host.endsWith(`.${own}`))
  );
};

const hasLinkScheme = (address: string) => /^https?:\/\//iu.test(address);

// An absolute http or https address of 2,048 characters at most, naming
// no user or password, on another host than the short links' own.
const isShortenable = (address: string, addresses: ShortAddresses) => {
  const parsed = URL.parse(address);
  const base = URL.parse(addresses.base);

  // Written as its redirect writes it (`URL.href`: ASCII, as a header
  // takes it), of 2,048 characters at most.
  return (
    parsed !== null &&
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.host !== base?.host &&
    parsed.href.length <= maxShortenedLinkLength &&
    /^[\u0021-\u007E]+$/u.test(parsed.href)
  );
};

/**
 * The links of `text` a post that asks for short links sends shortened on
 * `platform`, as the server decides it: those written with `http://` or
 * `https://` and longer than a short address (`base` and a code), one
 * entry per distinct address with every place it stands; none on a
 * platform that keeps links as written. The composer counts them.
 */
export const linksToShorten = (
  text: string,
  platform: Platform,
  addresses: ShortAddresses
): readonly LinkToShorten[] => {
  if (keepsLinksAsWritten(platform)) {
    return [];
  }

  const shortLength = addresses.base.length + addresses.codeLength;
  const found = new Map<string, LinkPlace[]>();

  for (const { end, start } of xLinksIn(text)) {
    const address = text.slice(start, end);

    if (
      hasLinkScheme(address) &&
      address.length > shortLength &&
      !isOwnLink(address, platform) &&
      isShortenable(address, addresses)
    ) {
      found.set(address, [...(found.get(address) ?? []), { end, start }]);
    }
  }

  return Array.from(found, ([address, places]) => ({ address, places }));
};
