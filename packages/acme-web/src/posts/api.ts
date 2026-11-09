import type { DateTime } from "effect";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

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

/**
 * A TikTok channel's creator, read from TikTok each time the composer
 * opens the channel's options, as TikTok's guidelines ask.
 */
export const tiktokCreator = (workspaceId: string, channelId: string) =>
  AcmeApi.query("tiktok", "creator", {
    params: { channelId, workspaceId },
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

/** What a post's attempts were, refreshed with the other posts queries. */
export const postAttempts = (workspaceId: string, postId: string) =>
  AcmeApi.query("posts", "attempts", {
    params: { postId, workspaceId },
    reactivityKeys: postsKeys,
  });

// Post ids and cursors are UUIDs, so a slash cannot appear in either.
const draftPageKey = (workspaceId: string, cursor: Option.Option<string>) =>
  `${workspaceId}/${Option.getOrElse(cursor, () => "")}`;

const draftPages = Atom.family((key: string) => {
  const [workspaceId = "", cursor = ""] = key.split("/");

  return AcmeApi.query("posts", "drafts", {
    params: { workspaceId },
    query: cursor === "" ? {} : { cursor },
    reactivityKeys: postsKeys,
  });
});

/** A page of the workspace's drafts, newest first: the first, or the one at `cursor`. */
export const draftPage = (workspaceId: string, cursor: Option.Option<string>) =>
  draftPages(draftPageKey(workspaceId, cursor));

export const createPost = AcmeApi.mutation("posts", "create");

export const updatePost = AcmeApi.mutation("posts", "update");

export const schedulePost = AcmeApi.mutation("posts", "schedule");

export const reschedulePost = AcmeApi.mutation("posts", "reschedule");

export const cancelPost = AcmeApi.mutation("posts", "cancel");

export const unschedulePost = AcmeApi.mutation("posts", "unschedule");

export const discardPost = AcmeApi.mutation("posts", "discard");

export const repostTarget = AcmeApi.mutation("posts", "repost");

export const confirmTarget = AcmeApi.mutation("posts", "confirm");
