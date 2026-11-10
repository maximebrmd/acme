import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The ads queries and mutations. What the ad network counts is read by the
// server every hour, so nothing here polls it. A change passes
// `reactivityKeys: adsChanged(workspaceId)`, which reads again the sign-ins,
// the ad accounts, their spending and the posts' boosts.

/** What refreshes a workspace's ads once a change lands. */
export const adsChanged = (workspaceId: string) => [`ads:${workspaceId}`];

/** What the server offers of ads: nothing, reading, or spending too. */
export const adsStatus = Atom.family((workspaceId: string) =>
  PealApi.query("ads", "status", { params: { workspaceId } })
);

export const adConnections = Atom.family((workspaceId: string) =>
  PealApi.query("ads", "listConnections", {
    params: { workspaceId },
    reactivityKeys: adsChanged(workspaceId),
  })
);

export const adAccounts = Atom.family((workspaceId: string) =>
  PealApi.query("ads", "listAccounts", {
    params: { workspaceId },
    reactivityKeys: adsChanged(workspaceId),
  })
);

/** An ad account with what its boosts commit this month. */
export const adSpending = (workspaceId: string, accountId: string) =>
  PealApi.query("ads", "getAccount", {
    params: { accountId, workspaceId },
    reactivityKeys: adsChanged(workspaceId),
  });

/** An ad account's campaigns, with their numbers over the last 30 days. */
export const adCampaigns = (workspaceId: string, accountId: string) =>
  PealApi.query("ads", "listCampaigns", {
    params: { accountId, workspaceId },
    query: {},
  });

/** What an ad account's ads did each of the last 30 days. */
export const adInsights = (workspaceId: string, accountId: string) =>
  PealApi.query("ads", "listInsights", {
    params: { accountId, workspaceId },
    query: {},
  });

/** A post's organic and paid numbers, and its boosts. */
export const postPerformance = (workspaceId: string, postId: string) =>
  PealApi.query("ads", "postPerformance", {
    params: { postId, workspaceId },
    reactivityKeys: adsChanged(workspaceId),
  });

export const startAdSignIn = PealApi.mutation("ads", "connect");

export const completeAdSignIn = PealApi.mutation("ads", "completeConnect");

export const connectAdAccounts = PealApi.mutation("ads", "connectAccounts");

export const removeAdSignIn = PealApi.mutation("ads", "disconnect");

export const removeAdAccount = PealApi.mutation("ads", "removeAccount");

export const setAdSpending = PealApi.mutation("ads", "setSpending");

export const quoteBoost = PealApi.mutation("ads", "quoteBoost");

export const createBoost = PealApi.mutation("ads", "createBoost");

export const pauseBoost = PealApi.mutation("ads", "pauseBoost");

export const resumeBoost = PealApi.mutation("ads", "resumeBoost");

export const stopBoost = PealApi.mutation("ads", "stopBoost");
