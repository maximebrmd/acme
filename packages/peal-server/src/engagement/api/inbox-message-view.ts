import { DateTime, Option, Schema } from "effect";
import type {
  InboxConversation,
  InboxConversationDetail,
  InboxConversationPage,
  InboxDirectMessage,
  InboxMessageSettings,
  InboxOutgoingMessage,
} from "peal-contract";

import type {
  ConversationDetail,
  ConversationPage,
} from "#engagement/application/engagement-messages.ts";
import type { MessageSettingsView } from "#engagement/application/message-settings.ts";
import type {
  ConversationCursor,
  ConversationSummary,
  MessageCursor,
} from "#engagement/application/ports/message-store.ts";
import { ConversationIdSchema } from "#engagement/domain/conversation-id.ts";
import { isUnread } from "#engagement/domain/conversation.ts";
import type { Conversation } from "#engagement/domain/conversation.ts";
import { DirectMessageIdSchema } from "#engagement/domain/direct-message-id.ts";
import type { DirectMessage } from "#engagement/domain/direct-message.ts";
import type { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";

// What the API and the MCP tools answer about direct messages.

export const toConversationView = (
  conversation: Conversation,
  messages: number
): InboxConversation => ({
  channelId: conversation.channelId,
  id: conversation.id,
  lastIncomingAt: Option.getOrNull(conversation.lastIncomingAt),
  lastMessageAt: conversation.lastMessageAt,
  messages,
  participants: conversation.participants.map((participant) => ({
    displayName: Option.getOrNull(participant.displayName),
    handle: participant.handle,
    platformId: participant.platformId,
  })),
  readAt: Option.getOrNull(conversation.readAt),
  request: conversation.request,
  unread: isUnread(conversation),
});

const toSummaryView = (summary: ConversationSummary): InboxConversation =>
  toConversationView(summary.conversation, summary.messages);

export const toDirectMessageView = (
  message: DirectMessage
): InboxDirectMessage => ({
  attachments: message.attachments,
  conversationId: message.conversationId,
  fromAccount: message.fromAccount,
  id: message.id,
  senderPlatformId: Option.getOrNull(message.senderPlatformId),
  sentAt: message.sentAt,
  text: message.text,
});

export const toOutgoingMessageView = (
  message: OutgoingMessage
): InboxOutgoingMessage => {
  const { status } = message;

  return {
    authorId: Option.getOrNull(message.authorId),
    conversationId: message.conversationId,
    createdAt: message.createdAt,
    id: message.id,
    platformMessageId:
      status._tag === "sent"
        ? Option.getOrNull(status.platformMessageId)
        : null,
    reason:
      status._tag === "failed" || status._tag === "unconfirmed"
        ? status.reason
        : null,
    settledAt: status._tag === "sending" ? null : status.at,
    status: status._tag,
    text: message.text,
  };
};

// A cursor is where a page ended, as text: its latest message's instant
// and the conversation's id.
const encodeCursor = (cursor: ConversationCursor): string =>
  [DateTime.toEpochMillis(cursor.lastMessageAt), cursor.conversationId].join(
    "_"
  );

const decodeConversationId = Schema.decodeUnknownOption(ConversationIdSchema);

// The last millisecond of the year 9999: past it, an instant has no ISO
// text the database reads.
const latestInstant = 253_402_300_799_999;

const instantOf = (millis: string): Option.Option<DateTime.Utc> =>
  /^\d{1,15}$/u.test(millis) && Number(millis) <= latestInstant
    ? DateTime.make(Number(millis))
    : Option.none();

/** The cursor a client sent back, if it is one this server made. */
export const conversationCursorOf = (
  text: string
): Option.Option<ConversationCursor> => {
  const [millis = "", id = ""] = text.split("_");

  return Option.all({
    conversationId: decodeConversationId(id),
    lastMessageAt: instantOf(millis),
  });
};

export const toConversationPageView = (
  page: ConversationPage
): InboxConversationPage => ({
  items: page.items.map(toSummaryView),
  nextCursor: page.next.pipe(Option.map(encodeCursor), Option.getOrNull),
});

const decodeMessageId = Schema.decodeUnknownOption(DirectMessageIdSchema);

// A page of messages ends at a message: its instant and its id, as text.
const encodeMessageCursor = (cursor: MessageCursor): string =>
  [DateTime.toEpochMillis(cursor.sentAt), cursor.messageId].join("_");

/** The cursor of a conversation's page a client sent back, if this server made it. */
export const messageCursorOf = (text: string): Option.Option<MessageCursor> => {
  const [millis = "", id = ""] = text.split("_");

  return Option.all({
    messageId: decodeMessageId(id),
    sentAt: instantOf(millis),
  });
};

export const toMessageSettingsView = (
  settings: MessageSettingsView
): InboxMessageSettings => ({
  applications: settings.applications.map((application) => ({
    clientId: application.clientId,
    grantedAt: application.grantedAt,
    grantedBy: Option.getOrNull(application.grantedBy),
  })),
  channels: settings.channels.map((channel) => ({
    channelId: channel.channelId,
    enabledAt: channel.enabledAt,
    enabledBy: Option.getOrNull(channel.enabledBy),
  })),
});

export const toConversationDetailView = (
  detail: ConversationDetail
): InboxConversationDetail => ({
  abilities: { ...detail.abilities },
  conversation: toConversationView(detail.conversation, detail.total),
  messages: detail.messages.map(toDirectMessageView),
  nextCursor: detail.older.pipe(
    Option.map(encodeMessageCursor),
    Option.getOrNull
  ),
  platform: Option.getOrNull(detail.platform),
  sent: detail.sent.map(toOutgoingMessageView),
  window: {
    closesAt: Option.getOrNull(detail.window.closesAt),
    open: detail.window.open,
  },
});
