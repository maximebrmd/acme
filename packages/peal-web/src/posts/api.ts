import type { DateTime } from "effect";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The queries and mutations of the composer and the calendar. A mutation
// passes `reactivityKeys: postsKeys`, which refreshes every posts query.

export const postsKeys = ["posts"];

/** The channels connected to the workspace. */
export const workspaceChannels = (workspaceId: string) =>
  PealApi.query("channels", "list", {
    params: { workspaceId },
    reactivityKeys: ["channels"],
  });

/**
 * A TikTok channel's creator, read from TikTok each time the composer
 * opens the channel's options, as TikTok's guidelines ask.
 */
export const tiktokCreator = (workspaceId: string, channelId: string) =>
  PealApi.query("tiktok", "creator", {
    params: { channelId, workspaceId },
    reactivityKeys: ["channels"],
  });

/** A post of the workspace. */
export const workspacePost = (workspaceId: string, postId: string) =>
  PealApi.query("posts", "get", {
    params: { postId, workspaceId },
    reactivityKeys: postsKeys,
  });

/** The posts scheduled from `from` to `to`. */
export const scheduledPosts = (
  workspaceId: string,
  from: DateTime.Utc,
  to: DateTime.Utc
) =>
  PealApi.query("posts", "list", {
    params: { workspaceId },
    query: { from, to },
    reactivityKeys: postsKeys,
  });

/** What a post's attempts were, refreshed with the other posts queries. */
export const postAttempts = (workspaceId: string, postId: string) =>
  PealApi.query("posts", "attempts", {
    params: { postId, workspaceId },
    reactivityKeys: postsKeys,
  });

// Post ids and cursors are UUIDs, so a slash cannot appear in either.
const draftPageKey = (workspaceId: string, cursor: Option.Option<string>) =>
  `${workspaceId}/${Option.getOrElse(cursor, () => "")}`;

const draftPages = Atom.family((key: string) => {
  const [workspaceId = "", cursor = ""] = key.split("/");

  return PealApi.query("posts", "drafts", {
    params: { workspaceId },
    query: cursor === "" ? {} : { cursor },
    reactivityKeys: postsKeys,
  });
});

/** A page of the workspace's drafts, newest first: the first, or the one at `cursor`. */
export const draftPage = (workspaceId: string, cursor: Option.Option<string>) =>
  draftPages(draftPageKey(workspaceId, cursor));

export const createPost = PealApi.mutation("posts", "create");

export const updatePost = PealApi.mutation("posts", "update");

export const schedulePost = PealApi.mutation("posts", "schedule");

export const reschedulePost = PealApi.mutation("posts", "reschedule");

export const cancelPost = PealApi.mutation("posts", "cancel");

export const unschedulePost = PealApi.mutation("posts", "unschedule");

export const discardPost = PealApi.mutation("posts", "discard");

export const repostTarget = PealApi.mutation("posts", "repost");

export const confirmTarget = PealApi.mutation("posts", "confirm");
