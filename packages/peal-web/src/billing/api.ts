import { Atom } from "effect/reactivity";
import type { CalendarDay } from "peal-contract";

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

/** What the billing account spends past a group's allowances a month. */
export const setSpendCeiling = PealApi.mutation("billingActions", "setCeiling");

/** Whether the workspace reads its X channels at X's rates. */
export const setXReads = PealApi.mutation("billingActions", "setXReads");

/** The workspace's usage over the UTC days from `from` to `to`. */
export const usageOf = (
  workspaceId: string,
  period: { readonly from: CalendarDay; readonly to: CalendarDay }
) =>
  PealApi.query("usage", "get", {
    params: { workspaceId },
    query: period,
    reactivityKeys: [`billing:${workspaceId}`],
  });

// Handing the workspace to another payer: its payer offers it to another
// owner, who takes it over or declines; the payer may withdraw it.

export const offerTransfer = PealApi.mutation(
  "billingActions",
  "offerTransfer"
);

export const acceptTransfer = PealApi.mutation(
  "billingActions",
  "acceptTransfer"
);

export const withdrawTransfer = PealApi.mutation(
  "billingActions",
  "withdrawTransfer"
);
