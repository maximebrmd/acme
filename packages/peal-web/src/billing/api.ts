import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

/** The workspace's plan, its limits and its usage, with the visitor's cookies. */
export const billingOf = Atom.family((workspaceId: string) =>
  PealApi.query("billing", "get", {
    params: { workspaceId },
    reactivityKeys: [`billing:${workspaceId}`],
  })
);
