import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's queues. A change passes
// `reactivityKeys: queuesChanged(workspaceId)`, which lists them again,
// with their coming slots; so does a change to the channels, as a queue
// says which of its channels are no longer connected, and a post made or
// moved, which takes or frees a slot.

/** What refreshes a workspace's queues once a change lands. */
export const queuesChanged = (workspaceId: string) => [`queues:${workspaceId}`];

export const workspaceQueues = Atom.family((workspaceId: string) =>
  PealApi.query("queues", "list", {
    params: { workspaceId },
    reactivityKeys: [...queuesChanged(workspaceId), "channels"],
  })
);

/** How many coming slots a queue shows where it is listed. */
export const shownSlots = 3;

/** A queue's coming slots, and the one a post added now would take. */
export const queueSlots = (
  workspaceId: string,
  queueId: string,
  count: number = shownSlots
) =>
  PealApi.query("queues", "slots", {
    params: { queueId, workspaceId },
    query: { count },
    reactivityKeys: [...queuesChanged(workspaceId), "posts"],
  });

export const createQueue = PealApi.mutation("queues", "create");

export const updateQueue = PealApi.mutation("queues", "update");

export const deleteQueue = PealApi.mutation("queues", "delete");

export const enqueuePost = PealApi.mutation("posts", "enqueue");
