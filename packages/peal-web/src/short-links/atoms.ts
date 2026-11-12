import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's short links. A change passes
// `reactivityKeys: shortLinksChanged(workspaceId)`, which reads them again.

/** What refreshes a workspace's short links once a change lands. */
export const shortLinksChanged = (workspaceId: string) => [
  `short-links:${workspaceId}`,
];

export const shortLinkStatus = Atom.family((workspaceId: string) =>
  PealApi.query("shortLinks", "status", {
    params: { workspaceId },
    reactivityKeys: shortLinksChanged(workspaceId),
  })
);

/** A post's short links, with their clicks over the last 30 days. */
export const postShortLinks = Atom.family(
  ({ postId, workspaceId }: { postId: string; workspaceId: string }) =>
    PealApi.query("shortLinks", "list", {
      params: { workspaceId },
      query: { postId },
      reactivityKeys: shortLinksChanged(workspaceId),
    })
);

export const setShortLinkDefault = PealApi.mutation("shortLinks", "setDefault");
