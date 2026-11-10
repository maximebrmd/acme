import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The inbox's queries and mutations. A change to a comment or a reply
// passes `reactivityKeys: inboxChanged(workspaceId, threadId)`, which reads
// the thread and the workspace's list again.

/** What refreshes a workspace's list of threads. */
export const threadsChanged = (workspaceId: string) => [`inbox:${workspaceId}`];

/** What refreshes one thread. */
export const threadChanged = (threadId: string) => [`inbox-thread:${threadId}`];

/** What refreshes a thread and its workspace's list once a change lands. */
export const inboxChanged = (workspaceId: string, threadId: string) => [
  ...threadsChanged(workspaceId),
  ...threadChanged(threadId),
];

/** Which threads the list shows. */
export interface ThreadFilter {
  /** One channel's threads only, or every channel's when null. */
  readonly channelId: string | null;
  /** Only threads with a comment waiting for an answer. */
  readonly unanswered: boolean;
}

// What narrows the list, as the API takes it: only what was asked.
interface ThreadQuery {
  channelId?: string;
  cursor?: string;
  unanswered?: "true";
}

// Workspace and channel ids are UUIDs, so a slash cannot appear in them;
// the cursor comes last, as the server alone knows what it holds.
const threadPages = Atom.family((key: string) => {
  const [workspaceId = "", channelId = "", unanswered = "", ...rest] =
    key.split("/");

  const cursor = rest.join("/");

  const query: ThreadQuery = {};

  if (channelId !== "") {
    query.channelId = channelId;
  }

  if (cursor !== "") {
    query.cursor = cursor;
  }

  if (unanswered === "true") {
    query.unanswered = "true";
  }

  return PealApi.query("inbox", "listThreads", {
    params: { workspaceId },
    query,
    reactivityKeys: threadsChanged(workspaceId),
  });
});

/**
 * A page of the workspace's threads, those with a comment waiting first:
 * the first page, or the one at `cursor`.
 */
export const threadPage = (
  workspaceId: string,
  filter: ThreadFilter,
  cursor: string | null
) =>
  threadPages(
    `${workspaceId}/${filter.channelId ?? ""}/${filter.unanswered ? "true" : "false"}/${cursor ?? ""}`
  );

const threads = Atom.family((key: string) => {
  const [workspaceId = "", threadId = ""] = key.split("/");

  return PealApi.query("inbox", "getThread", {
    params: { threadId, workspaceId },
    reactivityKeys: threadChanged(threadId),
  });
});

/** A thread whole: its comments, the replies sent from Peal, its abilities. */
export const inboxThread = (workspaceId: string, threadId: string) =>
  threads(`${workspaceId}/${threadId}`);

export const replyToComment = PealApi.mutation("inbox", "reply");

export const setCommentAnswered = PealApi.mutation("inbox", "setAnswered");

export const moderateComment = PealApi.mutation("inbox", "moderate");

export const confirmInboxReply = PealApi.mutation("inbox", "confirmReply");

export const withdrawInboxReply = PealApi.mutation("inbox", "withdrawReply");
