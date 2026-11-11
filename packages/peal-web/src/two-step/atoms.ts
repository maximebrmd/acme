import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

/** What a workspace requires of its members, which every member reads. */
export const workspaceSecurity = Atom.family((workspaceId: string) =>
  PealApi.query("workspaces", "security", {
    params: { workspaceId },
    reactivityKeys: [`security:${workspaceId}`],
  })
);

/** Requires two-step verification of every member, or stops requiring it. */
export const secureWorkspace = PealApi.mutation("workspaces", "secure");
