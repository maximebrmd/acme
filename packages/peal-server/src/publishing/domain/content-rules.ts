import { Array as Arr, Duration, Match, Option, Result, Schema } from "effect";

import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { ChannelId, MediaAssetId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { optionsOn } from "./channel-options.ts";
import type { ChannelOptions } from "./channel-options.ts";
import type { ContentViolation } from "./content-violation.ts";
import { countedText } from "./counted-text.ts";
import { FacebookOptions } from "./facebook-options.ts";
import type { FieldNotes } from "./field-description.ts";
import { InstagramOptions, instagramReelFields } from "./instagram-options.ts";
import { LinkedInOptions, pageProblems } from "./linkedin-options.ts";
import type { Dimensions, MediaFile } from "./media-file.ts";
import { mediaNamedBy } from "./named-media.ts";
import type { OptionProblem } from "./option-problem.ts";
import { followUpsThrough, partRulesFor, rulesFor } from "./platform-rules.ts";
import type {
  FormatLimits,
  MediaRules,
  PlatformRules,
} from "./platform-rules.ts";
import { PostContentRejected } from "./post-content-rejected.ts";
import {
  emptyContent,
  overriddenChannels,
  partAlone,
  partCount,
  sentTo,
  textOn,
} from "./post-content.ts";
import type { PostContent } from "./post-content.ts";
import { describedNotesOn, optionProblemsOn } from "./target-options.ts";
import type { TargetOptions } from "./target-options.ts";
import {
  countHashtags,
  countLinks,
  countMentions,
  measureText,
} from "./text-length.ts";
import { ThreadsOptions } from "./threads-options.ts";
import { TikTokOptions } from "./tiktok-options.ts";

/** A channel a post goes to, and the platform whose rules it follows. */
export interface ChannelOnPlatform {
  readonly channelId: ChannelId;
  /**
   * The way in the channel came through, where its platform has several
   * and the rules differ by it (a LinkedIn company page). Left out
   * elsewhere, and never part of a violation.
   */
  readonly connection?: ChannelConnection;
  readonly platform: Platform;
}

const isThreads = Schema.is(ThreadsOptions);

const isTikTok = Schema.is(TikTokOptions);

const isInstagram = Schema.is(InstagramOptions);

const isFacebook = Schema.is(FacebookOptions);

// The options that are set, of those named, in the order given.
const setAmong = <Options, Field extends keyof Options & string>(
  options: Options,
  fields: readonly Field[]
): readonly Field[] => fields.filter((field) => options[field] !== undefined);

// The files of the media the first part of `content` shows, in its order.
const filesOf = (
  content: PostContent,
  files: readonly MediaFile[]
): readonly MediaFile[] =>
  content.media.flatMap(({ mediaId }) =>
    files.filter((file) => file.mediaId === mediaId)
  );

// A video's length in whole milliseconds, as the media API shows it.
const durationMsOf = (file: MediaFile): Option.Option<number> =>
  file.duration.pipe(
    Option.map((duration) => Math.round(Duration.toMillis(duration)))
  );

// A frame at `offset` milliseconds lies within the video, when its length
// is known.
const withinVideo = (offset: number | undefined, file: MediaFile) =>
  offset === undefined ||
  Option.match(durationMsOf(file), {
    onNone: () => true,
    onSome: (durationMs) => offset < durationMs,
  });

// What TikTok refuses given the post's media: a video's cover frame on
// photos or past the video, a photo post's title, music and cover on a
// video, or a cover past the last photo.
const tikTokMediaFields = (
  options: TikTokOptions,
  shown: readonly MediaFile[]
): readonly string[] => {
  const [first] = shown;

  if (first === undefined) {
    return [];
  }

  const video = shown.find((file) => file.kind === "video");

  if (video !== undefined) {
    return [
      // Music added is a choice; left out or false, nothing is.
      ...(options.autoAddMusic === true ? ["autoAddMusic"] : []),
      ...setAmong(options, ["photoCoverIndex", "photoTitle"]),
      ...(withinVideo(options.videoCoverTimestampMs, video)
        ? []
        : ["videoCoverTimestampMs"]),
    ];
  }

  return [
    ...(options.photoCoverIndex !== undefined &&
    options.photoCoverIndex >= shown.length
      ? ["photoCoverIndex"]
      : []),
    ...setAmong(options, ["videoCoverTimestampMs"]),
  ];
};

// What Instagram refuses given the post's media: a reel's settings on
// anything but a post of one video, or a cover frame past its end. A
// story takes none of them, which its options' problems say already.
const instagramMediaFields = (
  content: PostContent,
  options: InstagramOptions,
  shown: readonly MediaFile[]
): readonly string[] => {
  const [only] = shown;

  if (options.format === "story") {
    return [];
  }

  const reel =
    content.media.length === 1 && only !== undefined && only.kind === "video";

  if (!reel) {
    return setAmong(options, instagramReelFields);
  }

  return withinVideo(options.thumbOffsetMs, only) ? [] : ["thumbOffsetMs"];
};

// What a file an option names must be: one of the types the option takes,
// no larger than it takes. A file that is not the workspace's is said
// elsewhere, as unknown media.
const namedFileFields = (
  options: TargetOptions,
  files: readonly MediaFile[]
): readonly string[] => {
  const notes: Readonly<Record<string, FieldNotes>> = describedNotesOn(
    options.platform
  );

  return mediaNamedBy(options).flatMap(({ field, mediaId }) => {
    const file = files.find((found) => found.mediaId === mediaId);
    const { contentTypes = [], maxByteSize } = notes[field] ?? {};

    return file === undefined ||
      (contentTypes.includes(file.contentType) &&
        (maxByteSize === undefined || file.byteSize <= maxByteSize))
      ? []
      : [field];
  });
};

// The fields the channel's platform refuses given the post's media.
const mediaRefusedFields = (
  content: PostContent,
  options: TargetOptions,
  files: readonly MediaFile[]
): readonly string[] => {
  const shown = filesOf(content, files);

  if (isThreads(options)) {
    return options.linkAttachment !== undefined && content.media.length > 0
      ? ["linkAttachment"]
      : [];
  }

  if (isTikTok(options)) {
    return tikTokMediaFields(options, shown);
  }

  if (isInstagram(options)) {
    return instagramMediaFields(content, options, shown);
  }

  // A story's title is refused whatever its media, by the options alone.
  if (isFacebook(options)) {
    return options.videoTitle !== undefined &&
      options.format !== "story" &&
      !shown.some((file) => file.kind === "video")
      ? ["videoTitle"]
      : [];
  }

  return [];
};

/**
 * What the channel's platform refuses in its options given the post's
 * media, which an options class cannot see (`problems` reads the options
 * alone): Threads' link attachment, "only available for text-only posts";
 * TikTok's cover frame for a video and its title, music and cover for
 * photos; an Instagram reel's settings, for a post of one video; a
 * Facebook video's title; and the type and size of a file an option names
 * (a thumbnail, a cover), among `files`, which hold every file the post
 * depends on (`referencedMedia`). A field is named once, in the order of
 * the options' fields.
 */
export const mediaOptionViolationsOn = (
  content: PostContent,
  channel: ChannelOnPlatform,
  options: Option.Option<TargetOptions>,
  files: readonly MediaFile[] = []
): readonly ContentViolation[] =>
  Option.match(options, {
    onNone: () => [],
    onSome: (chosen) => {
      const refused = new Set([
        ...mediaRefusedFields(content, chosen, files),
        ...namedFileFields(chosen, files),
      ]);

      return [...refused].toSorted().map((field): ContentViolation => ({
        _tag: "optionInvalid",
        ...channel,
        field,
      }));
    },
  });

/**
 * What options saved to start posts from (a channel set's, a channel's
 * defaults) may not hold: a file of the library, which a default would
 * keep a post depending on, and which may be deleted meanwhile. Each such
 * option is invalid there.
 */
export const namedMediaViolationsOn = (
  channel: ChannelOnPlatform,
  options: TargetOptions
): readonly ContentViolation[] =>
  mediaNamedBy(options).map(({ field }): ContentViolation => ({
    _tag: "optionInvalid",
    ...channel,
    field,
  }));

// A channel as violations name it: its id and its platform.
const named = ({
  channelId,
  platform,
}: ChannelOnPlatform): ChannelOnPlatform => ({
  channelId,
  platform,
});

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
  overriddenChannels(content)
    .filter((channelId) => !channelIds.includes(channelId))
    .map((channelId) => ({ _tag: "overrideWithoutChannel", channelId }));

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

const isLinkedIn = Schema.is(LinkedInOptions);

// What the way in the channel came through refuses in its options, beyond
// its platform's rules.
const connectionViolationsOn = (
  channel: ChannelOnPlatform,
  options: Option.Option<TargetOptions>
): readonly ContentViolation[] =>
  channel.connection === "linkedinPage"
    ? options
        .pipe(
          Option.filter(isLinkedIn),
          Option.map(pageProblems),
          Option.getOrElse(() => [])
        )
        .map((problem) => optionViolation(named(channel), problem))
    : [];

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
      otherPlatform(named(channel), optionsOn(options, channel.channelId))
    ),
  ]);
};

/**
 * What options saved to start posts from must hold (a channel set's, a
 * channel's defaults): what a draft's must (`checkDraft`), and no file of
 * the library (`namedMediaViolationsOn`).
 */
export const checkSavedOptions = (
  channels: readonly ChannelOnPlatform[],
  options: readonly ChannelOptions[]
): Result.Result<PostContent, PostContentRejected> =>
  Result.flatMap(checkDraft(emptyContent, channels, options), (content) =>
    checked(
      content,
      channels.flatMap((channel) =>
        Option.match(optionsOn(options, channel.channelId), {
          onNone: () => [],
          onSome: (chosen) => namedMediaViolationsOn(named(channel), chosen),
        })
      )
    )
  );

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

/**
 * What the channel's platform would refuse in the post, with the options
 * it has there, which some platforms count with the text (`countedText`)
 * and which may choose a format with rules of its own (`rulesFor`): a
 * format that sends no text (a story) checks none.
 */
export const violationsOn = (
  content: PostContent,
  channel: ChannelOnPlatform,
  options: Option.Option<TargetOptions> = Option.none(),
  rules: PlatformRules = rulesFor(channel.platform, options)
): readonly ContentViolation[] => {
  const sent = textOn(content, channel.channelId);
  const media = content.media.length;

  if (sent.trim() === "" && media === 0) {
    return [{ _tag: "empty", ...channel }];
  }

  const text = rules.sendsText === false ? "" : sent;

  const counted = countedText(text, options);

  const tooLong = rules.textLimits.flatMap(
    ({ maximum, unit }): readonly ContentViolation[] => {
      const length = measureText(counted, unit);

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
  { aspectRatio, maxPixels, sideRange }: FormatLimits,
  on: MediaOnChannel,
  { height, width }: Dimensions
): readonly ContentViolation[] => {
  const ratio = width / height;

  return [
    ...(sideRange !== undefined &&
    [width, height].some(
      (side) => side < sideRange.minimum || side > sideRange.maximum
    )
      ? [
          {
            _tag: "sideOutOfRange" as const,
            ...on,
            height,
            maximum: sideRange.maximum,
            minimum: sideRange.minimum,
            width,
          },
        ]
      : []),
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

  const { maxByteSize, minByteSize } = limits;
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
    ...(minByteSize !== undefined && file.byteSize < minByteSize
      ? [
          {
            _tag: "mediaTooSmall" as const,
            ...on,
            byteSize: file.byteSize,
            minimum: minByteSize,
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
 * company, then how many videos there are and whether they come with
 * images, by the rules of the format the options choose (`rulesFor`). A
 * platform whose media rules are not known refuses nothing here; how many
 * it takes is in `violationsOn`.
 */
export const mediaViolationsOn = (
  content: PostContent,
  channel: ChannelOnPlatform,
  files: readonly MediaFile[],
  options: Option.Option<TargetOptions> = Option.none()
): readonly ContentViolation[] => {
  const inForce = rulesFor(channel.platform, options);
  const rules = inForce.media;

  // A platform whose media rules are not known may take images and videos
  // Peal cannot check; a document goes only where the rules say so.
  if (rules === undefined) {
    return files.flatMap((file) =>
      file.kind === "document"
        ? [
            {
              _tag: "mediaTypeUnsupported" as const,
              ...channel,
              contentType: file.contentType,
              mediaId: file.mediaId,
            },
          ]
        : []
    );
  }

  const altTexts = new Map(
    content.media.map(({ altText, mediaId }) => [mediaId, altText])
  );

  const videos = files.filter((file) => file.kind === "video").length;
  const mixed = !rules.mixesKinds && videos > 0 && videos < files.length;

  // A file that takes fewer companions than the platform's own count, as
  // X's GIFs, which go alone. Past that count, `violationsOn` says so.
  const { maxMedia } = inForce;

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

// The violations of one part, with its place: none for the first.
const inPart = (
  violations: readonly ContentViolation[],
  part: number
): readonly ContentViolation[] =>
  violations.map((violation) =>
    "platform" in violation ? { ...violation, part } : violation
  );

/**
 * What the channel's platform would refuse in the parts after the post's
 * first: more parts than it takes, where it takes any, then in each part
 * what it refuses in a post, as every part goes out as one there, named
 * with the part's place. `files` are those of every part.
 */
export const partViolationsOn = (
  content: PostContent,
  channel: ChannelOnPlatform,
  files: readonly MediaFile[],
  options: Option.Option<TargetOptions> = Option.none(),
  // The way in the channel came through, which violations never name.
  connection: Option.Option<ChannelConnection> = Option.fromUndefinedOr(
    channel.connection
  )
): readonly ContentViolation[] => {
  if (content.followUps.length === 0) {
    return [];
  }

  const followUps = followUpsThrough(channel.platform, connection, options);

  const taken = followUps?.maximum ?? 0;

  if (content.followUps.length > taken) {
    return [
      {
        _tag: "tooManyParts",
        ...channel,
        count: partCount(content),
        maximum: taken + 1,
      },
    ];
  }

  // A comment holds text alone, within a comment's limits: its files are
  // refused by their count, and checked no further.
  const rules = partRulesFor(channel.platform, options);

  return content.followUps.flatMap((_part, position) => {
    const alone = partAlone(content, position + 1);

    return inPart(
      [
        ...violationsOn(alone, channel, options, rules),
        ...(followUps?.kind === "comment"
          ? []
          : mediaViolationsOn(alone, channel, filesOf(alone, files), options)),
      ],
      position + 1
    );
  });
};

/**
 * Whether the post can be scheduled on these channels: for one channel at
 * least, with text overrides and options for them only, within each
 * platform's rules on the text it has there and on the media it shows
 * there (its own, when an override gives it some: `sentTo`), in every
 * part, whose files are `files`, and with the options each platform needs,
 * as `options` gives them.
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
    ...channels.flatMap((connected) => {
      const channel = named(connected);
      const chosen = optionsOn(options, channel.channelId);
      // The post with the media the channel receives, which may be its own.
      const sent = sentTo(content, channel.channelId);

      return [
        ...violationsOn(sent, channel, chosen),
        ...mediaViolationsOn(sent, channel, filesOf(sent, files), chosen),
        ...partViolationsOn(
          sent,
          channel,
          files,
          chosen,
          Option.fromUndefinedOr(connected.connection)
        ),
        ...optionViolationsOn(channel, chosen),
        ...mediaOptionViolationsOn(sent, channel, chosen, files),
        ...connectionViolationsOn(connected, chosen),
      ];
    }),
  ]);
};
