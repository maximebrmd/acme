import { Atom } from "effect/reactivity";
import { maxInboxPageSize } from "peal-contract";

import { PealApi } from "#api/client.ts";

// The queries and mutations of the inbox's reviews. A change to a review
// or a reply passes `reactivityKeys: reviewsChanged(workspaceId, threadId)`,
// which reads the location and the workspace's list again.

/** What refreshes a workspace's list of locations. */
export const locationsChanged = (workspaceId: string) => [
  `inbox-reviews:${workspaceId}`,
];

/** What refreshes one location's reviews. */
export const locationChanged = (threadId: string) => [
  `inbox-reviews-thread:${threadId}`,
];

/** What refreshes a location and its workspace's list once a change lands. */
export const reviewsChanged = (workspaceId: string, threadId: string) => [
  ...locationsChanged(workspaceId),
  ...locationChanged(threadId),
];

/**
 * The workspace's locations with reviews, those with a review waiting
 * first: one page of the most, as a workspace has few locations.
 */
export const reviewLocations = Atom.family((workspaceId: string) =>
  PealApi.query("inboxReviews", "listReviewThreads", {
    params: { workspaceId },
    query: { limit: maxInboxPageSize },
    reactivityKeys: locationsChanged(workspaceId),
  })
);

const locations = Atom.family((key: string) => {
  const [workspaceId = "", threadId = ""] = key.split("/");

  return PealApi.query("inboxReviews", "getReviewThread", {
    params: { threadId, workspaceId },
    reactivityKeys: locationChanged(threadId),
  });
});

/** A location's reviews whole, the replies sent from Peal, its abilities. */
export const reviewLocation = (workspaceId: string, threadId: string) =>
  locations(`${workspaceId}/${threadId}`);

export const replyToReview = PealApi.mutation("inboxReviews", "replyToReview");

export const setReviewAnswered = PealApi.mutation(
  "inboxReviews",
  "setReviewAnswered"
);

export const withdrawReviewReply = PealApi.mutation(
  "inboxReviews",
  "withdrawReviewReply"
);
