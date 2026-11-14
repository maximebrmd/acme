import { Duration, Effect, Option, Schema } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

import type { MediaAttachment } from "./media-attachment.ts";
import { Poll } from "./poll.ts";
import {
  maxFollowUps,
  PartMediaSchema,
  PartOverridesSchema,
  PostPart,
} from "./post-part.ts";
import { PostTextSchema } from "./post-text.ts";
import { changedOverride, TextOverride } from "./text-override.ts";

export { maxMediaPerPost } from "./post-part.ts";

/**
 * What a post says: its text, the media it shows, in order, and what it
 * has instead on some of its channels (a text, and media of its own when
 * the override gives some: `partsOn`, `sentTo`). That is its first part, and all of
 * most posts; `followUps` are the parts after it, in order
 * (`./post-part.ts`). Content stored before posts had parts has none.
 * `poll` is a poll asked with the first part, where its platforms take
 * one (`./poll.ts`); content from before polls has none.
 */
export class PostContent extends Schema.Class<PostContent>(
  "peal-server/publishing/domain/PostContent"
)({
  followUps: Schema.Array(PostPart)
    .check(Schema.isMaxLength(maxFollowUps))
    .pipe(
      Schema.withDecodingDefaultKey(Effect.succeed([])),
      Schema.withConstructorDefault(Effect.succeed([]))
    ),
  media: PartMediaSchema,
  overrides: PartOverridesSchema,
  poll: Schema.OptionFromNullOr(Poll).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null)),
    Schema.withConstructorDefault(Effect.succeed(Option.none()))
  ),
  text: PostTextSchema,
}) {}

/** A post that says nothing yet. */
export const emptyContent = new PostContent({
  media: [],
  overrides: [],
  text: "",
});

const overrideOn = (
  overrides: readonly TextOverride[],
  channelId: ChannelId
): Option.Option<TextOverride> =>
  Option.fromUndefinedOr(
    overrides.find((override) => override.channelId === channelId)
  );

const textAmong = (
  overrides: readonly TextOverride[],
  channelId: ChannelId,
  text: string
): string =>
  overrideOn(overrides, channelId).pipe(
    Option.map((override) => override.text),
    Option.getOrElse(() => text)
  );

// The media a part shows on a channel: its override's there, when the
// override gives some, or its own.
const mediaAmong = (
  overrides: readonly TextOverride[],
  channelId: ChannelId,
  media: readonly MediaAttachment[]
): readonly MediaAttachment[] =>
  overrideOn(overrides, channelId).pipe(
    Option.flatMap((override) => Option.fromUndefinedOr(override.media)),
    Option.getOrElse(() => media)
  );

/**
 * The text the post's first part has on a channel: its override there, or
 * its own.
 */
export const textOn = (content: PostContent, channelId: ChannelId): string =>
  textAmong(content.overrides, channelId, content.text);

/** How many parts the post has: its first, and those that follow. */
export const partCount = (content: PostContent): number =>
  1 + content.followUps.length;

/** One part of a post as it goes out on a channel. */
export interface PartOnChannel {
  /** How long it waits after the part before it went out. */
  readonly delay: Duration.Duration;
  /** Its place in the post, from 0, the post itself. */
  readonly index: number;
  /** Its media on the channel: its override's there, or its own. */
  readonly media: readonly MediaAttachment[];
  /** Its text on the channel: its override there, or its own. */
  readonly text: string;
}

/** The post's parts as they go out on a channel, in order. */
export const partsOn = (
  content: PostContent,
  channelId: ChannelId
): readonly PartOnChannel[] => [
  {
    delay: Duration.zero,
    index: 0,
    media: mediaAmong(content.overrides, channelId, content.media),
    text: textOn(content, channelId),
  },
  ...content.followUps.map((part, position) => ({
    delay: Duration.seconds(part.delaySeconds),
    index: position + 1,
    media: mediaAmong(part.overrides, channelId, part.media),
    text: textAmong(part.overrides, channelId, part.text),
  })),
];

/**
 * The post's content with only the part at `index`, as a post of one part:
 * what the rules of a platform read when they check that part.
 */
export const partAlone = (content: PostContent, index: number): PostContent => {
  const part = content.followUps[index - 1];

  return part === undefined
    ? new PostContent({
        media: content.media,
        overrides: content.overrides,
        poll: content.poll,
        text: content.text,
      })
    : new PostContent({
        media: part.media,
        overrides: part.overrides,
        text: part.text,
      });
};

// The overrides with `text` as the channel's own, in the place its
// override had, with the media it gave, or after the others.
const overriddenWith = (
  overrides: readonly TextOverride[],
  channelId: ChannelId,
  text: string
): readonly TextOverride[] =>
  overrides.some((kept) => kept.channelId === channelId)
    ? overrides.map((kept) =>
        kept.channelId === channelId ? changedOverride(kept, { text }) : kept
      )
    : [...overrides, new TextOverride({ channelId, text })];

/**
 * The post's content with `text` as the part at `index`'s own text on
 * the channel (its override there), every other channel's text, and
 * every other part, as they were. A part the post does not have changes
 * nothing.
 */
export const withTextOn = (
  content: PostContent,
  index: number,
  channelId: ChannelId,
  text: string
): PostContent =>
  index === 0
    ? new PostContent({
        followUps: content.followUps,
        media: content.media,
        overrides: overriddenWith(content.overrides, channelId, text),
        poll: content.poll,
        text: content.text,
      })
    : new PostContent({
        followUps: content.followUps.map((part, position) =>
          position + 1 === index
            ? new PostPart({
                delaySeconds: part.delaySeconds,
                media: part.media,
                overrides: overriddenWith(part.overrides, channelId, text),
                text: part.text,
              })
            : part
        ),
        media: content.media,
        overrides: content.overrides,
        poll: content.poll,
        text: content.text,
      });

/**
 * Every image and video the post shows, in any part, on any channel (a
 * part's own, then those its overrides give some channels), each once.
 */
export const shownMedia = (
  content: PostContent
): readonly MediaAttachment[] => {
  const seen = new Set<string>();

  return [content, ...content.followUps]
    .flatMap(({ media, overrides }) => [
      ...media,
      ...overrides.flatMap((override) => override.media ?? []),
    ])
    .filter(({ mediaId }) => {
      if (seen.has(mediaId)) {
        return false;
      }

      seen.add(mediaId);

      return true;
    });
};

/** Every channel a text override of any part names. */
export const overriddenChannels = (
  content: PostContent
): readonly ChannelId[] => [
  ...new Set(
    [content, ...content.followUps].flatMap(({ overrides }) =>
      overrides.map(({ channelId }) => channelId)
    )
  ),
];

// A part's overrides with their text alone: what a channel's copy keeps.
const textsOnly = (
  overrides: readonly TextOverride[]
): readonly TextOverride[] =>
  overrides.map(({ channelId, text }) => new TextOverride({ channelId, text }));

/**
 * The post as it goes out on a channel: each part with the media it shows
 * there (`partsOn`), and the texts it has on its channels. What the
 * platforms' rules read when they check the post on that channel, so each
 * channel is checked on the media it receives.
 */
export const sentTo = (
  content: PostContent,
  channelId: ChannelId
): PostContent =>
  new PostContent({
    followUps: content.followUps.map(
      (part) =>
        new PostPart({
          delaySeconds: part.delaySeconds,
          media: mediaAmong(part.overrides, channelId, part.media),
          overrides: textsOnly(part.overrides),
          text: part.text,
        })
    ),
    media: mediaAmong(content.overrides, channelId, content.media),
    overrides: textsOnly(content.overrides),
    poll: content.poll,
    text: content.text,
  });

/**
 * The post's content without what any part has on these channels: their
 * texts and media of their own go with the channels.
 */
export const withoutChannels = (
  content: PostContent,
  channelIds: readonly ChannelId[]
): PostContent => {
  const kept = (overrides: readonly TextOverride[]) =>
    overrides.filter(({ channelId }) => !channelIds.includes(channelId));

  return new PostContent({
    followUps: content.followUps.map(
      (part) =>
        new PostPart({
          delaySeconds: part.delaySeconds,
          media: part.media,
          overrides: kept(part.overrides),
          text: part.text,
        })
    ),
    media: content.media,
    overrides: kept(content.overrides),
    poll: content.poll,
    text: content.text,
  });
};
