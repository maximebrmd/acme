import { platformRules } from "#publishing/domain/platform-rules.ts";
import type { TextLimit } from "#publishing/domain/platform-rules.ts";
import { measureText } from "#publishing/domain/text-length.ts";
import type { Platform } from "#shared/domain/platform.ts";

export type { TextLimit } from "#publishing/domain/platform-rules.ts";

/**
 * The limits a platform sets on a post's text, as publishing checks them
 * before it schedules a post: for other contexts that write posts, such as
 * the writing assistant. None when Peal knows no limit for the platform.
 */
export const textLimitsOn = (platform: Platform): readonly TextLimit[] =>
  platformRules[platform].textLimits;

/** A limit a text passes, with its length counted as the limit counts. */
export interface TextOverflow extends TextLimit {
  readonly length: number;
}

/**
 * The first of a platform's limits the text passes, if any: for contexts
 * that send text as a post is sent, such as a reply to a comment.
 */
export const textOverflowOn = (
  platform: Platform,
  text: string
): TextOverflow | undefined => {
  for (const limit of textLimitsOn(platform)) {
    const length = measureText(text, limit.unit);

    if (length > limit.maximum) {
      return { ...limit, length };
    }
  }

  return undefined;
};
