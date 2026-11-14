import { Atom } from "effect/reactivity";
import type { Channel } from "peal-contract";

import { PealApi } from "#api/client.ts";
import { channelsOf } from "#channels/channels-api.ts";

// The articles' queries and mutations. A mutation passes
// `reactivityKeys: articlesKeys(workspaceId)`, which refreshes the list
// and every article of the workspace.

/** What refreshes a workspace's articles once a change lands. */
export const articlesKeys = (workspaceId: string) => [
  `articles:${workspaceId}`,
];

/** The workspace's articles, newest first. */
export const workspaceArticles = (workspaceId: string) =>
  PealApi.query("articles", "list", {
    params: { workspaceId },
    query: {},
    reactivityKeys: articlesKeys(workspaceId),
  });

/** One article of the workspace. */
export const workspaceArticle = (workspaceId: string, articleId: string) =>
  PealApi.query("articles", "get", {
    params: { articleId, workspaceId },
    reactivityKeys: articlesKeys(workspaceId),
  });

/** Whether the channel is a website's, which takes articles. */
export const isSiteChannel = (channel: Channel): boolean =>
  channel.platform === "wordpress";

/** The workspace's websites: the channels articles go to. */
export const workspaceSites = Atom.family((workspaceId: string) =>
  Atom.mapResult(channelsOf(workspaceId), (channels) =>
    channels.filter(isSiteChannel)
  )
);

export const createArticle = PealApi.mutation("articles", "create");

export const updateArticle = PealApi.mutation("articles", "update");

export const deleteArticle = PealApi.mutation("articles", "delete");

export const scheduleArticle = PealApi.mutation("articles", "schedule");

export const unscheduleArticle = PealApi.mutation("articles", "unschedule");

export const retryArticle = PealApi.mutation("articles", "retry");

export const unpublishArticle = PealApi.mutation("articles", "unpublish");

export const updateArticleOnSite = PealApi.mutation("articles", "updateOnSite");
