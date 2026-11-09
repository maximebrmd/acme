import { Atom } from "effect/reactivity";

import { AcmeApi } from "#api/client.ts";

/** The workspace's plan, its limits and its usage, with the visitor's cookies. */
export const billingOf = Atom.family((workspaceId: string) =>
  AcmeApi.query("billing", "get", {
    params: { workspaceId },
    reactivityKeys: [`billing:${workspaceId}`],
  })
);
