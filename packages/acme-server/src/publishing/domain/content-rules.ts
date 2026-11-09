import { Array as Arr, Duration, Match, Option, Result } from "effect";

import type { ChannelId, MediaAssetId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { optionsOn } from "./channel-options.ts";
import type { ChannelOptions } from "./channel-options.ts";
import type { ContentViolation } from "./content-violation.ts";
import type { Dimensions, MediaFile } from "./media-file.ts";
import type { OptionProblem } from "./option-problem.ts";
import { platformRules } from "./platform-rules.ts";
import type { FormatLimits, MediaRules } from "./platform-rules.ts";
import { PostContentRejected } from "./post-content-rejected.ts";
import { textOn } from "./post-content.ts";
import type { PostContent } from "./post-content.ts";
import { optionProblemsOn } from "./target-options.ts";
import type { TargetOptions } from "./target-options.ts";
import {
  countHashtags,
  countLinks,
  countMentions,
  measureText,
} from "./text-length.ts";

/** A channel a post goes to, and the platform whose rules it follows. */
export interface ChannelOnPlatform {
  readonly channelId: ChannelId;
  readonly platform: Platform;
}

// One of the post's images or videos, on one channel.
interface MediaOnChannel extends ChannelOnPlatform {
  readonly mediaId: MediaAssetId;
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

const optionsWithoutChannel = (
  options: readonly ChannelOptions[],
  channelIds: readonly ChannelId[]
): readonly ContentViolation[] =>
  options.flatMap(({ channelId }) =>
    channelIds.includes(channelId)
      ? []
      : [{ _tag: "optionsWithoutChannel" as const, channelId }]
  );

const otherPlatform = (
  channel: ChannelOnPlatform,
  options: Option.Option<TargetOptions>
): readonly ContentViolation[] =>
  Option.match(options, {
    onNone: () => [],
    onSome: ({ platform }) =>
      platform === channel.platform
        ? []
        : [
            {
              _tag: "optionsForOtherPlatform",
              ...channel,
              optionsPlatform: platform,
            },
          ],
  });

const optionViolation = (
  channel: ChannelOnPlatform,
  problem: OptionProblem
): ContentViolation =>
  Match.valueTags(problem, {
    invalid: ({ field }): ContentViolation => ({
      _tag: "optionInvalid",
      ...channel,
      field,
    }),
    missing: ({ field }): ContentViolation => ({
      _tag: "optionMissing",
      ...channel,
      field,
    }),
    tooLong: ({ field, length, maximum }): ContentViolation => ({
      _tag: "optionTooLong",
      ...channel,
      field,
      length,
      maximum,
    }),
  });

/**
 * What the channel's platform would refuse in the options the post has
 * there, or in none at all (`#publishing/domain/target-options.ts`): those
 * of another platform, then each option it needs and lacks or refuses.
 */
export const optionViolationsOn = (
  channel: ChannelOnPlatform,
  options: Option.Option<TargetOptions>
): readonly ContentViolation[] => {
  const mismatched = otherPlatform(channel, options);

  return Arr.isReadonlyArrayNonEmpty(mismatched)
    ? mismatched
    : optionProblemsOn(channel.platform, options).map((problem) =>
        optionViolation(channel, problem)
      );
};

/**
 * What a draft for these channels must hold: text overrides and options
 * only for some of them, and options of their own platforms. The platforms'
 * rules wait until it is scheduled, so a draft can be longer than they take,
 * or lack options they need, while the user works on it.
 */
export const checkDraft = (
  content: PostContent,
  channels: readonly ChannelOnPlatform[],
  options: readonly ChannelOptions[] = []
): Result.Result<PostContent, PostContentRejected> => {
  const channelIds = channels.map(({ channelId }) => channelId);

  return checked(content, [
    ...overridesWithoutChannel(content, channelIds),
    ...optionsWithoutChannel(options, channelIds),
    ...channels.flatMap((channel) =>
      otherPlatform(channel, optionsOn(options, channel.channelId))
    ),
  ]);
};

const atMost = (
  tag:
    | "tooManyHashtags"
    | "tooManyLinks"
    | "tooManyMedia"
    | "tooManyMentions"
    | "tooManyVideos",
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

  const forbidden = (rules.forbiddenCharacters ?? []).filter((character) =>
    text.includes(character)
  );

  return [
    ...tooLong,
    ...(forbidden.length > 0
      ? [
          {
            _tag: "forbiddenCharacters" as const,
            ...channel,
            characters: forbidden,
          },
        ]
      : []),
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
    ...atMost("tooManyLinks", channel, countLinks(text), rules.maxLinks),
  ];
};

// A video's duration is checked in whole milliseconds, rounded as the media
// API shows it (`durationMs`), so a client that checks what the API shows
// finds what the server finds, and a violation never reads "140 seconds, at
// most 140 seconds".
const durationViolations = (
  limits: FormatLimits,
  on: MediaOnChannel,
  duration: Duration.Duration
): readonly ContentViolation[] => {
  const { maxDurationMs, minDurationMs } = limits;
  const durationMs = Math.round(Duration.toMillis(duration));

  return [
    ...(maxDurationMs !== undefined && durationMs > maxDurationMs
      ? [
          {
            _tag: "videoTooLong" as const,
            ...on,
            durationMs,
            maximumMs: maxDurationMs,
          },
        ]
      : []),
    ...(minDurationMs !== undefined && durationMs < minDurationMs
      ? [
          {
            _tag: "videoTooShort" as const,
            ...on,
            durationMs,
            minimumMs: minDurationMs,
          },
        ]
      : []),
  ];
};

const dimensionViolations = (
  { aspectRatio, maxPixels }: FormatLimits,
  on: MediaOnChannel,
  { height, width }: Dimensions
): readonly ContentViolation[] => {
  const ratio = width / height;

  return [
    ...(maxPixels !== undefined && width * height > maxPixels
      ? [
          {
            _tag: "tooManyPixels" as const,
            ...on,
            height,
            maximum: maxPixels,
            width,
          },
        ]
      : []),
    ...(aspectRatio !== undefined &&
    (ratio < aspectRatio.minimum || ratio > aspectRatio.maximum)
      ? [
          {
            _tag: "aspectRatioUnsupported" as const,
            ...on,
            height,
            maximum: aspectRatio.maximum,
            minimum: aspectRatio.minimum,
            width,
          },
        ]
      : []),
  ];
};

// What the platform refuses about one file, with the alt text it has here.
const fileViolations = (
  rules: MediaRules,
  channel: ChannelOnPlatform,
  file: MediaFile,
  altText: string
): readonly ContentViolation[] => {
  const on: MediaOnChannel = { ...channel, mediaId: file.mediaId };
  const limits = rules.formats[file.contentType];

  if (limits === undefined) {
    return [
      { _tag: "mediaTypeUnsupported", ...on, contentType: file.contentType },
    ];
  }

  const { maxByteSize } = limits;
  const { maxAltTextLength } = rules;
  const altTextLength = measureText(altText, "codePoints");

  return [
    ...(maxByteSize !== undefined && file.byteSize > maxByteSize
      ? [
          {
            _tag: "mediaTooLarge" as const,
            ...on,
            byteSize: file.byteSize,
            maximum: maxByteSize,
          },
        ]
      : []),
    ...Option.match(file.duration, {
      onNone: () => [],
      onSome: (duration) => durationViolations(limits, on, duration),
    }),
    ...Option.match(file.dimensions, {
      onNone: () => [],
      onSome: (dimensions) => dimensionViolations(limits, on, dimensions),
    }),
    ...(maxAltTextLength !== undefined && altTextLength > maxAltTextLength
      ? [
          {
            _tag: "altTextTooLong" as const,
            ...on,
            length: altTextLength,
            maximum: maxAltTextLength,
          },
        ]
      : []),
  ];
};

/**
 * What the channel's platform would refuse in the post's images and videos,
 * whose files are `files`, in the post's order: each file's type, size,
 * duration, dimensions and alt text, whether a file that goes alone has
 * company, then how many videos there are and whether they come with images. A platform whose media rules are not known
 * refuses nothing here; how many it takes is in `violationsOn`.
 */
export const mediaViolationsOn = (
  content: PostContent,
  channel: ChannelOnPlatform,
  files: readonly MediaFile[]
): readonly ContentViolation[] => {
  const rules = platformRules[channel.platform].media;

  if (rules === undefined) {
    return [];
  }

  const altTexts = new Map(
    content.media.map(({ altText, mediaId }) => [mediaId, altText])
  );

  const videos = files.filter((file) => file.kind === "video").length;
  const mixed = !rules.mixesKinds && videos > 0 && videos < files.length;

  // A file that takes fewer companions than the platform's own count, as
  // X's GIFs, which go alone. Past that count, `violationsOn` says so.
  const { maxMedia } = platformRules[channel.platform];

  const fewest = Math.min(
    ...files.map(
      (file) => rules.formats[file.contentType]?.maxMediaWith ?? Infinity
    )
  );

  const tooMany =
    files.length > fewest &&
    (maxMedia === undefined || content.media.length <= maxMedia);

  return [
    ...files.flatMap((file) =>
      fileViolations(rules, channel, file, altTexts.get(file.mediaId) ?? "")
    ),
    ...(tooMany
      ? [
          {
            _tag: "tooManyMedia" as const,
            ...channel,
            count: files.length,
            maximum: fewest,
          },
        ]
      : []),
    ...atMost("tooManyVideos", channel, videos, rules.maxVideos),
    ...(mixed ? [{ _tag: "mixedMedia" as const, ...channel }] : []),
  ];
};

/**
 * Whether the post can be scheduled on these channels: for one channel at
 * least, with text overrides and options for them only, within each
 * platform's rules on the text it has there and on its media, whose files
 * are `files`, and with the options each platform needs, as `options` gives
 * them.
 */
export const checkPublishable = (
  content: PostContent,
  channels: readonly ChannelOnPlatform[],
  files: readonly MediaFile[],
  options: readonly ChannelOptions[] = []
): Result.Result<PostContent, PostContentRejected> => {
  const channelIds = channels.map(({ channelId }) => channelId);

  return checked(content, [
    ...(channels.length === 0 ? [{ _tag: "noChannels" as const }] : []),
    ...overridesWithoutChannel(content, channelIds),
    ...optionsWithoutChannel(options, channelIds),
    ...channels.flatMap((channel) => [
      ...violationsOn(content, channel),
      ...mediaViolationsOn(content, channel, files),
      ...optionViolationsOn(channel, optionsOn(options, channel.channelId)),
    ]),
  ]);
};
