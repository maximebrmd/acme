import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

/** The workspace's plan, its limits and its usage, with the visitor's cookies. */
export const billingOf = Atom.family((workspaceId: string) =>
  PealApi.query("billing", "get", {
    params: { workspaceId },
    reactivityKeys: [`billing:${workspaceId}`],
  })
);

// What a member does on the billing page, each sent from the browser with
// its session cookie, so the API checks the page's origin: an order before
// checkout, a cancellation, a withdrawal and what it would do.

export const placeOrder = PealApi.mutation("billingActions", "order");

export const cancelSubscription = PealApi.mutation("billingActions", "cancel");

export const previewWithdrawal = PealApi.mutation(
  "billingActions",
  "withdrawal"
);

export const withdraw = PealApi.mutation("billingActions", "withdraw");
