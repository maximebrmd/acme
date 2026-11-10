import { PealApi } from "#api/client.ts";

// The queries and mutations of reviews: a workspace's approval policy, the
// approvals that wait, a post's comments, decisions and links. A mutation
// passes `reactivityKeys: reviewKeys`, which refreshes every review query,
// and `postsKeys` too when it changes a post's status.

export const reviewKeys = ["review"];

/** The workspace's approval policy. */
export const reviewSettings = (workspaceId: string) =>
  PealApi.query("review", "settings", {
    params: { workspaceId },
    reactivityKeys: reviewKeys,
  });

/** The approvals that wait in the workspace. */
export const pendingApprovals = (workspaceId: string) =>
  PealApi.query("review", "pending", {
    params: { workspaceId },
    // A post taken back or scheduled elsewhere no longer waits.
    reactivityKeys: [...reviewKeys, "posts"],
  });

/** A post's comments and approvals. */
export const postReview = (workspaceId: string, postId: string) =>
  PealApi.query("review", "thread", {
    params: { postId, workspaceId },
    reactivityKeys: [...reviewKeys, "posts"],
  });

/** A post's review links. */
export const reviewLinks = (workspaceId: string, postId: string) =>
  PealApi.query("review", "links", {
    params: { postId, workspaceId },
    reactivityKeys: reviewKeys,
  });

export const updateReviewSettings = PealApi.mutation(
  "review",
  "updateSettings"
);

export const addComment = PealApi.mutation("review", "comment");

export const resolveThread = PealApi.mutation("review", "resolve");

export const approvePost = PealApi.mutation("review", "approve");

export const requestPostChanges = PealApi.mutation("review", "requestChanges");

export const createReviewLink = PealApi.mutation("review", "createLink");

export const revokeReviewLink = PealApi.mutation("review", "revokeLink");

/** What a review link shows, to whoever holds its token. */
export const openReviewLink = (token: string) =>
  PealApi.query("reviewLink", "open", {
    headers: { "x-review-token": token },
    reactivityKeys: ["review-link"],
  });

export const visitorComment = PealApi.mutation("reviewLink", "comment");

export const visitorApprove = PealApi.mutation("reviewLink", "approve");

export const visitorRequestChanges = PealApi.mutation(
  "reviewLink",
  "requestChanges"
);
