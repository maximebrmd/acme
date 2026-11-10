import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

/** The workspace's members, as every member in person may list them. */
export const membersOf = Atom.family((workspaceId: string) =>
  PealApi.query("members", "list", {
    params: { workspaceId },
    reactivityKeys: [`members:${workspaceId}`],
  })
);

/** Where the workspace stands against its plan, for every member. */
export const standingOf = Atom.family((workspaceId: string) =>
  PealApi.query("billing", "standing", {
    params: { workspaceId },
    reactivityKeys: [`billing:${workspaceId}`],
  })
);

/** Keeps what a member chose in a workspace over its plan. */
export const reduceWorkspace = PealApi.mutation("billingActions", "reduce");

// The roles whose members order a plan (billing:manage).
const managing: ReadonlySet<string> = new Set(["admin", "owner"]);

/** Whether a member with this role, as it is stored, manages billing. */
export const managesBilling = (role: string): boolean =>
  role.split(",").some((name) => managing.has(name.trim()));
