import type { Channel, Post } from "peal-contract";

/**
 * The channels a post goes to that are still connected to the workspace, in
 * the post's order. A channel disconnected since the draft was saved is left
 * out: the channel picker cannot show it, so the user could not unselect it,
 * and saving the draft with it again would name a channel the workspace no
 * longer has.
 */
export const connectedTargets = (
  post: Post | undefined,
  channels: readonly Channel[]
): readonly string[] =>
  (post?.targets ?? []).flatMap(({ channelId }) =>
    channels.some(({ id }) => id === channelId) ? [channelId] : []
  );

/**
 * Every channel the picker offers, in the list's order, for "Select all":
 * those that publish, and those the post goes to already, which stay
 * chosen. A channel turned off or to reconnect publishes nothing, so it is
 * never added by this.
 */
export const everyChannel = (
  channels: readonly Channel[],
  selected: readonly string[]
): readonly string[] =>
  channels.flatMap(({ id, status }) =>
    status._tag === "active" || selected.includes(id) ? [id] : []
  );

// From how many channels the picker offers to select them all.
const everyChannelFrom = 3;

/** Whether the picker offers "Select all" and "Clear". */
export const offersEveryChannel = (channels: readonly Channel[]): boolean =>
  channels.length >= everyChannelFrom;
