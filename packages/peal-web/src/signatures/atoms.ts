import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's signatures. A change passes
// `reactivityKeys: signaturesChanged(workspaceId)`, which lists them again.

/** What refreshes a workspace's signatures once a change lands. */
export const signaturesChanged = (workspaceId: string) => [
  `signatures:${workspaceId}`,
];

export const workspaceSignatures = Atom.family((workspaceId: string) =>
  PealApi.query("signatures", "list", {
    params: { workspaceId },
    reactivityKeys: signaturesChanged(workspaceId),
  })
);

export const createSignature = PealApi.mutation("signatures", "create");

export const updateSignature = PealApi.mutation("signatures", "update");

export const deleteSignature = PealApi.mutation("signatures", "delete");
