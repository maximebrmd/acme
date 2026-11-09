import type { Platform } from "#shared/domain/platform.ts";

import type { TextUnit } from "./text-length.ts";

/** At most `maximum` of `unit`. */
export interface TextLimit {
  readonly maximum: number;
  readonly unit: TextUnit;
}

/**
 * What a platform accepts in one post, as far as Acme checks before
 * publishing. A limit left out is one Acme does not know yet: the platform
 * may still refuse the post when it goes out.
 */
export interface PlatformRules {
  readonly maxHashtags?: number;
  readonly maxMedia?: number;
  readonly maxMentions?: number;
  /** The platform publishes images and videos only, never text alone. */
  readonly mediaRequired: boolean;
  /** Every limit applies: Bluesky counts graphemes and bytes. */
  readonly textLimits: readonly TextLimit[];
}

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
// - Threads: 500 characters; carousels of up to 20 items.
// - Instagram: captions of 2,200 characters, 30 hashtags and 20 mentions;
//   no post without an image or a video; carousels of up to 20 items.
// - Facebook Pages, TikTok, YouTube and Pinterest: no limit known yet.
//
// "Characters" with no other word count code points, the stricter reading.
export const platformRules: Readonly<Record<Platform, PlatformRules>> = {
  bluesky: {
    maxMedia: 4,
    mediaRequired: false,
    textLimits: [
      { maximum: 300, unit: "graphemes" },
      { maximum: 3000, unit: "utf8Bytes" },
    ],
  },
  facebook: { mediaRequired: false, textLimits: [] },
  instagram: {
    maxHashtags: 30,
    maxMedia: 20,
    maxMentions: 20,
    mediaRequired: true,
    textLimits: [{ maximum: 2200, unit: "codePoints" }],
  },
  linkedin: {
    maxMedia: 20,
    mediaRequired: false,
    textLimits: [{ maximum: 3000, unit: "codePoints" }],
  },
  mastodon: {
    maxMedia: 4,
    mediaRequired: false,
    textLimits: [{ maximum: 500, unit: "codePoints" }],
  },
  pinterest: { mediaRequired: false, textLimits: [] },
  threads: {
    maxMedia: 20,
    mediaRequired: false,
    textLimits: [{ maximum: 500, unit: "codePoints" }],
  },
  tiktok: { mediaRequired: false, textLimits: [] },
  x: {
    maxMedia: 4,
    mediaRequired: false,
    textLimits: [{ maximum: 280, unit: "weighted" }],
  },
  youtube: { mediaRequired: false, textLimits: [] },
};
