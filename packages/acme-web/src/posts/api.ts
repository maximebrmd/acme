import type { DateTime } from "effect";

import { AcmeApi } from "#api/client.ts";

// The queries and mutations of the composer and the calendar. A mutation
// passes `reactivityKeys: postsKeys`, which refreshes every posts query.

export const postsKeys = ["posts"];

/** The channels connected to the workspace. */
export const workspaceChannels = (workspaceId: string) =>
  AcmeApi.query("channels", "list", {
    params: { workspaceId },
    reactivityKeys: ["channels"],
  });

/** A post of the workspace. */
export const workspacePost = (workspaceId: string, postId: string) =>
  AcmeApi.query("posts", "get", {
    params: { postId, workspaceId },
    reactivityKeys: postsKeys,
  });

/** The posts scheduled from `from` to `to`. */
export const scheduledPosts = (
  workspaceId: string,
  from: DateTime.Utc,
  to: DateTime.Utc
) =>
  AcmeApi.query("posts", "list", {
    params: { workspaceId },
    query: { from, to },
    reactivityKeys: postsKeys,
  });

export const createPost = AcmeApi.mutation("posts", "create");

export const updatePost = AcmeApi.mutation("posts", "update");

export const schedulePost = AcmeApi.mutation("posts", "schedule");

export const reschedulePost = AcmeApi.mutation("posts", "reschedule");

export const cancelPost = AcmeApi.mutation("posts", "cancel");
