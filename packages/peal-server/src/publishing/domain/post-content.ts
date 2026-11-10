import { Duration, Effect, Option, Schema } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

import type { MediaAttachment } from "./media-attachment.ts";
import {
  maxFollowUps,
  PartMediaSchema,
  PartOverridesSchema,
  PostPart,
} from "./post-part.ts";
import { PostTextSchema } from "./post-text.ts";
import type { TextOverride } from "./text-override.ts";

export { maxMediaPerPost } from "./post-part.ts";

/**
 * What a post says: its text, the media it shows, in order, and the text it
 * has instead on some of its channels. That is its first part, and all of
 * most posts; `followUps` are the parts after it, in order
 * (`./post-part.ts`). Content stored before posts had parts has none.
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
  text: PostTextSchema,
}) {}

/** A post that says nothing yet. */
export const emptyContent = new PostContent({
  media: [],
  overrides: [],
  text: "",
});

const textAmong = (
  overrides: readonly TextOverride[],
  channelId: ChannelId,
  text: string
): string =>
  Option.fromUndefinedOr(
    overrides.find((override) => override.channelId === channelId)
  ).pipe(
    Option.map((override) => override.text),
    Option.getOrElse(() => text)
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
    media: content.media,
    text: textOn(content, channelId),
  },
  ...content.followUps.map((part, position) => ({
    delay: Duration.seconds(part.delaySeconds),
    index: position + 1,
    media: part.media,
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
        text: content.text,
      })
    : new PostContent({
        media: part.media,
        overrides: part.overrides,
        text: part.text,
      });
};

/** Every image and video the post shows, in any part, each once. */
export const shownMedia = (
  content: PostContent
): readonly MediaAttachment[] => {
  const seen = new Set<string>();

  return [content, ...content.followUps]
    .flatMap(({ media }) => media)
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
