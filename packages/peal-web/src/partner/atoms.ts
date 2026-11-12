import { Atom } from "effect/reactivity";
import type { CalendarDay } from "peal-contract";

import { PealApi } from "#api/client.ts";

// A workspace's partner account, as its people read and run it: the
// account and what it holds, its keys, and the workspaces it owns.

const partnerKey = (workspaceId: string) => `partner:${workspaceId}`;

const keysKey = (workspaceId: string) => `partner-keys:${workspaceId}`;

/** What refreshes the account once a change lands. */
export const partnerChanged = (workspaceId: string) => [
  partnerKey(workspaceId),
];

/** What refreshes its keys once one is created or revoked. */
export const partnerKeysChanged = (workspaceId: string) => [
  keysKey(workspaceId),
];

export const partnerOf = Atom.family((workspaceId: string) =>
  PealApi.query("partnerAccount", "get", {
    params: { workspaceId },
    reactivityKeys: partnerChanged(workspaceId),
  })
);

export const partnerKeysOf = Atom.family((workspaceId: string) =>
  PealApi.query("partnerAccount", "listKeys", {
    params: { workspaceId },
    reactivityKeys: partnerKeysChanged(workspaceId),
  })
);

/** The workspaces the account owns, the newest of them. */
export const partnerWorkspacesOf = Atom.family((workspaceId: string) =>
  PealApi.query("partnerAccount", "listWorkspaces", {
    params: { workspaceId },
    query: {},
  })
);

/**
 * What the account and its workspaces used over a period, a page of its
 * workspaces at a time: `before` names the page after the first.
 */
export const partnerUsageOf = (
  workspaceId: string,
  query: {
    readonly before?: string;
    readonly from: CalendarDay;
    readonly to: CalendarDay;
  }
) =>
  PealApi.query("usage", "partner", {
    params: { workspaceId },
    query,
    reactivityKeys: [`billing:${workspaceId}`],
  });

export const openPartner = PealApi.mutation("partnerAccount", "open");

export const updatePartner = PealApi.mutation("partnerAccount", "update");

export const closePartner = PealApi.mutation("partnerAccount", "close");

export const createPartnerKey = PealApi.mutation("partnerAccount", "createKey");

export const revokePartnerKey = PealApi.mutation("partnerAccount", "revokeKey");
