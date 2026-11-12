import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The workspace's own image provider. A change passes
// `reactivityKeys: imageProviderChanged(workspaceId)`, which reads it again
// with the assistant's status, whose image source and cost it changes.

/** What refreshes the provider and the status once a change lands. */
export const imageProviderChanged = (workspaceId: string) => [
  `image-provider:${workspaceId}`,
];

export const workspaceImageProvider = Atom.family((workspaceId: string) =>
  PealApi.query("assistant", "imageProvider", {
    params: { workspaceId },
    reactivityKeys: imageProviderChanged(workspaceId),
  })
);

export const setImageProvider = PealApi.mutation(
  "assistant",
  "setImageProvider"
);

export const removeImageProvider = PealApi.mutation(
  "assistant",
  "removeImageProvider"
);
