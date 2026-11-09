import { platformRules } from "#publishing/domain/platform-rules.ts";
import type { TextLimit } from "#publishing/domain/platform-rules.ts";
import type { Platform } from "#shared/domain/platform.ts";

export type { TextLimit } from "#publishing/domain/platform-rules.ts";

/**
 * The limits a platform sets on a post's text, as publishing checks them
 * before it schedules a post: for other contexts that write posts, such as
 * the writing assistant. None when Peal knows no limit for the platform.
 */
export const textLimitsOn = (platform: Platform): readonly TextLimit[] =>
  platformRules[platform].textLimits;
