import { Array as Arr, Result } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import type { ContentViolation } from "./content-violation.ts";
import { platformRules } from "./platform-rules.ts";
import { PostContentRejected } from "./post-content-rejected.ts";
import { textOn } from "./post-content.ts";
import type { PostContent } from "./post-content.ts";
import { countHashtags, countMentions, measureText } from "./text-length.ts";

/** A channel a post goes to, and the platform whose rules it follows. */
export interface ChannelOnPlatform {
  readonly channelId: ChannelId;
  readonly platform: Platform;
}

const checked = (
  content: PostContent,
  violations: readonly ContentViolation[]
): Result.Result<PostContent, PostContentRejected> =>
  Arr.isReadonlyArrayNonEmpty(violations)
    ? Result.fail(new PostContentRejected({ violations }))
    : Result.succeed(content);

const overridesWithoutChannel = (
  content: PostContent,
  channelIds: readonly ChannelId[]
): readonly ContentViolation[] =>
  content.overrides
    .filter((override) => !channelIds.includes(override.channelId))
    .map(({ channelId }) => ({ _tag: "overrideWithoutChannel", channelId }));

/**
 * What a draft for these channels must hold: a text override only for one of
 * them. The platforms' rules wait until it is scheduled, so a draft can be
 * longer than they take while the user works on it.
 */
export const checkDraft = (
  content: PostContent,
  channelIds: readonly ChannelId[]
): Result.Result<PostContent, PostContentRejected> =>
  checked(content, overridesWithoutChannel(content, channelIds));

const atMost = (
  tag: "tooManyHashtags" | "tooManyMedia" | "tooManyMentions",
  channel: ChannelOnPlatform,
  count: number,
  maximum: number | undefined
): readonly ContentViolation[] =>
  maximum !== undefined && count > maximum
    ? [{ _tag: tag, ...channel, count, maximum }]
    : [];

/** What the channel's platform would refuse in the post. */
export const violationsOn = (
  content: PostContent,
  channel: ChannelOnPlatform
): readonly ContentViolation[] => {
  const rules = platformRules[channel.platform];
  const text = textOn(content, channel.channelId);
  const media = content.media.length;

  if (text.trim() === "" && media === 0) {
    return [{ _tag: "empty", ...channel }];
  }

  const tooLong = rules.textLimits.flatMap(
    ({ maximum, unit }): readonly ContentViolation[] => {
      const length = measureText(text, unit);

      return length > maximum
        ? [{ _tag: "textTooLong", ...channel, length, maximum, unit }]
        : [];
    }
  );

  return [
    ...tooLong,
    ...atMost("tooManyMedia", channel, media, rules.maxMedia),
    ...(rules.mediaRequired && media === 0
      ? [{ _tag: "mediaRequired" as const, ...channel }]
      : []),
    ...atMost(
      "tooManyHashtags",
      channel,
      countHashtags(text),
      rules.maxHashtags
    ),
    ...atMost(
      "tooManyMentions",
      channel,
      countMentions(text),
      rules.maxMentions
    ),
  ];
};

/**
 * Whether the post can be scheduled on these channels: for one channel at
 * least, with text overrides for them only, and within each platform's rules
 * on the text it has there.
 */
export const checkPublishable = (
  content: PostContent,
  channels: readonly ChannelOnPlatform[]
): Result.Result<PostContent, PostContentRejected> =>
  checked(content, [
    ...(channels.length === 0 ? [{ _tag: "noChannels" as const }] : []),
    ...overridesWithoutChannel(
      content,
      channels.map(({ channelId }) => channelId)
    ),
    ...channels.flatMap((channel) => violationsOn(content, channel)),
  ]);
