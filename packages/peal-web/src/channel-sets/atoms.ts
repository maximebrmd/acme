import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's channel sets. A change passes
// `reactivityKeys: channelSetsChanged(workspaceId)`, which lists them
// again; so does a change to the channels, as a set says which of its
// channels are no longer connected.

/** What refreshes a workspace's channel sets once a change lands. */
export const channelSetsChanged = (workspaceId: string) => [
  `channel-sets:${workspaceId}`,
];

export const workspaceChannelSets = Atom.family((workspaceId: string) =>
  PealApi.query("channelSets", "list", {
    params: { workspaceId },
    reactivityKeys: [...channelSetsChanged(workspaceId), "channels"],
  })
);

export const createChannelSet = PealApi.mutation("channelSets", "create");

export const updateChannelSet = PealApi.mutation("channelSets", "update");

export const deleteChannelSet = PealApi.mutation("channelSets", "delete");
