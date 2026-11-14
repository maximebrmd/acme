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
  const [workspaceId = "", conversationId = "", cursor = ""] = key.split("/");

  return PealApi.query("inboxMessages", "getConversation", {
    params: { conversationId, workspaceId },
    query: cursor === "" ? {} : { cursor },
    reactivityKeys: conversationChanged(conversationId),
  });
});

/**
 * A page of a conversation, the messages sent from Peal, its abilities:
 * the latest messages, or those before `cursor`.
 */
export const conversationDetail = (
  workspaceId: string,
  conversationId: string,
  cursor = ""
) => conversations(`${workspaceId}/${conversationId}/${cursor}`);

/** What refreshes the direct messages' settings. */
export const messageSettingsChanged = (workspaceId: string) => [
  `inbox-message-settings:${workspaceId}`,
  ...conversationListChanged(workspaceId),
];

/** The channels whose messages are on, and the applications let in. */
export const messageSettings = Atom.family((workspaceId: string) =>
  PealApi.query("inboxMessages", "getMessageSettings", {
    params: { workspaceId },
    reactivityKeys: messageSettingsChanged(workspaceId),
  })
);

export const setChannelMessages = PealApi.mutation(
  "inboxMessages",
  "setChannelMessages"
);

export const setMessageApplication = PealApi.mutation(
  "inboxMessages",
  "setMessageApplication"
);

export const sendMessage = PealApi.mutation("inboxMessages", "sendMessage");

export const setConversationRead = PealApi.mutation(
  "inboxMessages",
  "setConversationRead"
);

export const confirmMessage = PealApi.mutation(
  "inboxMessages",
  "confirmMessage"
);
