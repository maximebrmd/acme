import { Atom } from "effect/reactivity";
import { maxInboxPageSize } from "peal-contract";

import { PealApi } from "#api/client.ts";

// The queries and mutations of the inbox's direct messages. A change to a
// conversation passes `reactivityKeys: conversationsChanged(workspaceId,
// conversationId)`, which reads the conversation and the list again.

/** What refreshes a workspace's list of conversations. */
export const conversationListChanged = (workspaceId: string) => [
  `inbox-messages:${workspaceId}`,
];

/** What refreshes one conversation. */
export const conversationChanged = (conversationId: string) => [
  `inbox-conversation:${conversationId}`,
];

/** What refreshes a conversation and its workspace's list once a change lands. */
export const conversationsChanged = (
  workspaceId: string,
  conversationId: string
) => [
  ...conversationListChanged(workspaceId),
  ...conversationChanged(conversationId),
];

/** The workspace's latest conversations: one page of the most. */
export const conversationList = Atom.family((workspaceId: string) =>
  PealApi.query("inboxMessages", "listConversations", {
    params: { workspaceId },
    query: { limit: maxInboxPageSize },
    reactivityKeys: conversationListChanged(workspaceId),
  })
);

const conversations = Atom.family((key: string) => {
  const [workspaceId = "", conversationId = ""] = key.split("/");

  return PealApi.query("inboxMessages", "getConversation", {
    params: { conversationId, workspaceId },
    reactivityKeys: conversationChanged(conversationId),
  });
});

/** A conversation whole, the messages sent from Peal, its abilities. */
export const conversationDetail = (
  workspaceId: string,
  conversationId: string
) => conversations(`${workspaceId}/${conversationId}`);

export const sendMessage = PealApi.mutation("inboxMessages", "sendMessage");

export const setConversationRead = PealApi.mutation(
  "inboxMessages",
  "setConversationRead"
);

export const confirmMessage = PealApi.mutation(
  "inboxMessages",
  "confirmMessage"
);
