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
