import { Atom } from "effect/reactivity";
import { maxRecyclingPageSize } from "peal-contract";

import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's recycling rules. A change
// passes `reactivityKeys: rulesChanged(workspaceId)`, which lists them
// again; it changes no post at once, as the next post of a rule is made
// by the server's run.

/** What refreshes a workspace's rules once a change lands. */
export const rulesChanged = (workspaceId: string) => [
  `recycling:${workspaceId}`,
];

/** The workspace's rules, oldest first: a workspace keeps 100 at most going. */
export const workspaceRules = Atom.family((workspaceId: string) =>
  PealApi.query("recycling", "list", {
    params: { workspaceId },
    query: { limit: maxRecyclingPageSize },
    reactivityKeys: [...rulesChanged(workspaceId), "posts"],
  })
);

export const startRule = PealApi.mutation("recycling", "create");

export const updateRule = PealApi.mutation("recycling", "update");

export const resumeRule = PealApi.mutation("recycling", "resume");

export const stopRule = PealApi.mutation("recycling", "delete");
