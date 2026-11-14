import { Duration, Option } from "effect";

import type { ChannelOnPlatform } from "./content-rules.ts";
import type { ContentViolation } from "./content-violation.ts";
import { countedText } from "./counted-text.ts";
import { mediaLimitOf } from "./platform-capabilities.ts";
import { partRulesFor, rulesFor } from "./platform-rules.ts";
import { partsOn } from "./post-content.ts";
import type { PartOnChannel, PostContent } from "./post-content.ts";
import type { TargetOptions } from "./target-options.ts";
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

/** A part's text and what it holds, against its platform's limits. */
export interface PartCounts {
  readonly hashtags: LimitedCount;
  readonly links: LimitedCount;
  readonly media: LimitedCount;
  readonly mentions: LimitedCount;
  readonly text: string;
  readonly textCounts: readonly TextCount[];
}

/** A part after the first, by its place, from 1. */
export interface PartPreview extends PartCounts {
  readonly part: number;
}

/**
 * What a post would be on one channel: the text the channel receives,
 * counted as its platform counts it, what it holds against the platform's
 * limits, and what would refuse it there. Those are its first part's;
 * `parts` are the parts after it, in order.
 */
export interface ChannelPreview extends PartCounts {
  readonly channel: ChannelOnPlatform;
  readonly parts: readonly PartPreview[];
  /**
   * True when the post has text for the channel and the format its
   * options choose sends none (a story): the text is then left out of
   * the preview. Left out otherwise.
   */
  readonly textNotSent?: true;
  readonly violations: readonly ContentViolation[];
}

/**
 * The post on the channel, with the `violations` found for it there and
 * the `options` it has there. Its counts are those `violationsOn` checks,
 * part by part, the text counted as the platform counts it with its
 * options (`countedText`), so a preview never disagrees with a refusal.
 * Those are the rules of the format the options choose (`rulesFor`): a
 * story's text is not sent, so it is neither shown nor counted.
 */
export const previewOn = (
  content: PostContent,
  channel: ChannelOnPlatform,
  violations: readonly ContentViolation[],
  options: Option.Option<TargetOptions> = Option.none()
): ChannelPreview => {
  const postRules = rulesFor(channel.platform, options);
  const sendsText = postRules.sendsText !== false;

  // A later part is counted by its own rules: a comment's where the
  // platform's parts are comments (`partRulesFor`), as it is checked.
  const laterRules = partRulesFor(channel.platform, options);

  const countsOf = (
    { media, text: written }: PartOnChannel,
    rules: typeof postRules = postRules
  ): PartCounts => {
    const text = sendsText ? written : "";

    return {
      hashtags: { count: countHashtags(text), maximum: rules.maxHashtags },
      links: { count: countLinks(text), maximum: rules.maxLinks },
      // Peal's own limit where the platform takes more, or says nothing:
      // the number its capabilities give.
      media: { count: media.length, maximum: mediaLimitOf(rules) },
      mentions: { count: countMentions(text), maximum: rules.maxMentions },
      text,
      textCounts: sendsText
        ? rules.textLimits.map(({ maximum, unit }) => ({
            length: measureText(countedText(text, options), unit),
            maximum,
            unit,
          }))
        : [],
    };
  };

  const parts = partsOn(content, channel.channelId);
  const [opening, ...later] = parts;

  const preview: ChannelPreview = {
    // The post itself, which `partsOn` always lists first.
    ...countsOf(
      opening ?? {
        delay: Duration.zero,
        index: 0,
        media: content.media,
        text: content.text,
      }
    ),
    channel,
    parts: later.map((part) => ({
      ...countsOf(part, laterRules),
      part: part.index,
    })),
    violations,
  };

  // Text the channel will not receive is said, never dropped silently.
  return !sendsText && parts.some(({ text }) => text.trim() !== "")
    ? { ...preview, textNotSent: true }
    : preview;
};

/** The channel a violation is about, if it is about one. */
export const channelOf = (violation: ContentViolation) =>
  "platform" in violation ? violation.channelId : undefined;
