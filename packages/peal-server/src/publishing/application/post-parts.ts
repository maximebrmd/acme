import { Duration } from "effect";

import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { partsOn } from "#publishing/domain/post-content.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/** A part of a post after its first, as one channel will receive it. */
export interface FollowUpOnChannel {
  /** The seconds it waits after the part before it went out. */
  readonly delaySeconds: number;
  readonly media: readonly MediaAttachment[];
  readonly text: string;
}

/** A post as one channel will receive it: its text there, then its parts. */
export interface PostOnChannel {
  readonly followUps: readonly FollowUpOnChannel[];
  readonly text: string;
}

/**
 * The post's parts on a channel, for the contexts that show a post as its
 * channels will receive it (the review context): the text of its first
 * part there, then the parts that follow, in order.
 */
export const postOnChannel = (
  { content }: Post,
  channelId: ChannelId
): PostOnChannel => {
  const [first, ...followUps] = partsOn(content, channelId);

  return {
    followUps: followUps.map(({ delay, media, text }) => ({
      delaySeconds: Duration.toSeconds(delay),
      media,
      text,
    })),
    text: first?.text ?? content.text,
  };
};
