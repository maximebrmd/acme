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

// The workspace's own text provider, the same way: a change passes
// `reactivityKeys: textProviderChanged(workspaceId)`, which reads it again
// with the assistant's status, whose `source` it changes.

/** What refreshes the text provider and the status once a change lands. */
export const textProviderChanged = (workspaceId: string) => [
  `text-provider:${workspaceId}`,
];

export const workspaceTextProvider = Atom.family((workspaceId: string) =>
  PealApi.query("assistant", "textProvider", {
    params: { workspaceId },
    reactivityKeys: textProviderChanged(workspaceId),
  })
);

export const setTextProvider = PealApi.mutation("assistant", "setTextProvider");

export const removeTextProvider = PealApi.mutation(
  "assistant",
  "removeTextProvider"
);

/** Sends the workspace's text provider one short request; changes nothing. */
export const testTextProvider = PealApi.mutation(
  "assistant",
  "testTextProvider"
);
