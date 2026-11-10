import type { ChannelOnPlatform } from "./content-rules.ts";
import type { ContentViolation } from "./content-violation.ts";
import { mediaLimitOf } from "./platform-capabilities.ts";
import { platformRules } from "./platform-rules.ts";
import { textOn } from "./post-content.ts";
import type { PostContent } from "./post-content.ts";
import {
  countHashtags,
  countLinks,
  countMentions,
  measureText,
} from "./text-length.ts";
import type { TextUnit } from "./text-length.ts";

/** A text's length in one of its platform's units, and the most it takes. */
export interface TextCount {
  readonly length: number;
  readonly maximum: number;
  readonly unit: TextUnit;
}

/** How many of something a post holds, and the most its platform takes. */
export interface LimitedCount {
  readonly count: number;
  /** Undefined when Peal knows no limit for the platform. */
  readonly maximum: number | undefined;
}

/**
 * What a post would be on one channel: the text the channel receives,
 * counted as its platform counts it, what it holds against the platform's
 * limits, and what would refuse it there.
 */
export interface ChannelPreview {
  readonly channel: ChannelOnPlatform;
  readonly hashtags: LimitedCount;
  readonly links: LimitedCount;
  readonly media: LimitedCount;
  readonly mentions: LimitedCount;
  readonly text: string;
  readonly textCounts: readonly TextCount[];
  readonly violations: readonly ContentViolation[];
}

/**
 * The post on the channel, with the `violations` found for it there. Its
 * counts are those `violationsOn` checks, so a preview never disagrees
 * with a refusal.
 */
export const previewOn = (
  content: PostContent,
  channel: ChannelOnPlatform,
  violations: readonly ContentViolation[]
): ChannelPreview => {
  const rules = platformRules[channel.platform];
  const text = textOn(content, channel.channelId);

  return {
    channel,
    hashtags: { count: countHashtags(text), maximum: rules.maxHashtags },
    links: { count: countLinks(text), maximum: rules.maxLinks },
    // Peal's own limit where the platform takes more, or says nothing:
    // the number its capabilities give.
    media: { count: content.media.length, maximum: mediaLimitOf(rules) },
    mentions: { count: countMentions(text), maximum: rules.maxMentions },
    text,
    textCounts: rules.textLimits.map(({ maximum, unit }) => ({
      length: measureText(text, unit),
      maximum,
      unit,
    })),
    violations,
  };
};

/** The channel a violation is about, if it is about one. */
export const channelOf = (violation: ContentViolation) =>
  "platform" in violation ? violation.channelId : undefined;
