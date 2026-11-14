import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ConversationId } from "#engagement/domain/conversation-id.ts";
import type { Conversation } from "#engagement/domain/conversation.ts";
import type { DirectMessageId } from "#engagement/domain/direct-message-id.ts";
import type { DirectMessage } from "#engagement/domain/direct-message.ts";
import type { MessageBox } from "#engagement/domain/message-box.ts";
import type { OutgoingMessageId } from "#engagement/domain/outgoing-message-id.ts";
import type { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

/** A conversation with what its list shows. */
export interface ConversationSummary {
  readonly conversation: Conversation;
  /** The messages it keeps, from anyone. */
  readonly messages: number;
}

/** What narrows a workspace's list of conversations. */
export interface ConversationFilter {
  readonly channelId: Option.Option<ChannelId>;
  /** Only the conversations someone wrote to since a member read them. */
  readonly unread: boolean;
}

/** Where a page of conversations starts: after this one, latest message first. */
export interface ConversationCursor {
  readonly conversationId: ConversationId;
  readonly lastMessageAt: DateTime.Utc;
}

/** An idempotency key a request came with, and since when its uses count. */
export interface MessageKey {
  readonly key: string;
  /** Uses of the key before this instant are forgotten. */
  readonly since: DateTime.Utc;
}

/** How journalling a message ended. */
export type MessageJournalled =
  | { readonly _tag: "journalled" }
  // The key made this message, with the same conversation and text.
  | { readonly _tag: "replayed"; readonly message: OutgoingMessage }
  // The key made a message to another conversation, or with another text.
  | { readonly _tag: "keyReused" }
  // A message to the conversation is on its way or unconfirmed.
  | { readonly _tag: "pending"; readonly messageId: OutgoingMessageId }
  // The conversation went, with its channel, its workspace or its time.
  | { readonly _tag: "dropped" };

/**
 * The direct messages of the channels a workspace connected, and the
 * messages sent from Peal to them, as engagement keeps them.
 */
export class MessageStore extends Context.Service<
  MessageStore,
  {
    /**
     * Starts following these channels' messages, one box a channel: one
     * already followed stays as it is, and one of a workspace erased since
     * it was listed is passed over. Answers how many were new.
     */
    readonly follow: (
      boxes: readonly MessageBox[]
    ) => Effect.Effect<number, DatabaseError>;
    /** At most `limit` boxes due by `at`, the one that waited longest first. */
    readonly due: (
      at: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly MessageBox[], DatabaseError>;
    /** How many boxes are due by `at`. */
    readonly countDue: (
      at: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    readonly box: (
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<MessageBox>, DatabaseError>;
    /** Saves the box's schedule; one gone stays gone. */
    readonly saveBox: (box: MessageBox) => Effect.Effect<void, DatabaseError>;
    /**
     * Takes the box until the transaction ends: whoever changes its
     * conversations from what it read takes it first, and reads them after.
     */
    readonly lockBox: (
      channelId: ChannelId
    ) => Effect.Effect<void, DatabaseError>;
    /** The channel's conversations, by their id on the platform. */
    readonly conversationsOf: (
      channelId: ChannelId
    ) => Effect.Effect<readonly Conversation[], DatabaseError>;
    readonly conversation: (
      conversationId: string
    ) => Effect.Effect<Option.Option<ConversationSummary>, DatabaseError>;
    readonly listConversations: (
      workspaceId: WorkspaceId,
      filter: ConversationFilter,
      page: {
        readonly after: Option.Option<ConversationCursor>;
        readonly limit: number;
      }
    ) => Effect.Effect<readonly ConversationSummary[], DatabaseError>;
    /**
     * Saves conversations of one channel: new ones are inserted (one the
     * channel already holds under the same id on the platform is passed
     * over), known ones replaced. Answers those new to the channel.
     */
    readonly saveConversations: (
      saved: readonly Conversation[]
    ) => Effect.Effect<readonly Conversation[], DatabaseError>;
    /** The conversation's messages, oldest first. */
    readonly messagesOf: (
      conversationId: ConversationId
    ) => Effect.Effect<readonly DirectMessage[], DatabaseError>;
    /**
     * Saves messages of one conversation: new ones are inserted (one it
     * already holds under the same id on the platform is passed over),
     * known ones replaced. Answers the messages new to it.
     */
    readonly saveMessages: (
      saved: readonly DirectMessage[]
    ) => Effect.Effect<readonly DirectMessage[], DatabaseError>;
    /** Deletes messages the platform no longer shows. */
    readonly deleteMessages: (
      messageIds: readonly DirectMessageId[]
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Journals a message about to be sent. The database decides: one
     * message a conversation on its way or unconfirmed at a time, and one
     * message a key in the workspace (kept under its SHA-256, never the
     * key).
     */
    readonly journalMessage: (
      message: OutgoingMessage,
      key: Option.Option<MessageKey>
    ) => Effect.Effect<MessageJournalled, DatabaseError>;
    readonly outgoing: (
      messageId: string
    ) => Effect.Effect<Option.Option<OutgoingMessage>, DatabaseError>;
    /** The messages sent from Peal to the conversation, oldest first. */
    readonly outgoingOf: (
      conversationId: ConversationId
    ) => Effect.Effect<readonly OutgoingMessage[], DatabaseError>;
    /**
     * Moves a message from the status it was read in, attempt included,
     * to `next`. False when it moved meanwhile: nothing is changed.
     */
    readonly advanceMessage: (
      next: OutgoingMessage,
      from: OutgoingMessage
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Records that a gate is about to call the platform for the message,
     * only while it is on its way. False otherwise: nothing is sent.
     */
    readonly claimCall: (
      messageId: OutgoingMessageId,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * At most `limit` messages still on their way, written by
     * `writtenBefore`, with no call claimed after `calledBefore`.
     */
    readonly strandedMessages: (
      writtenBefore: DateTime.Utc,
      calledBefore: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly OutgoingMessage[], DatabaseError>;
    /** Deletes the channel's box, its conversations and what they hold, at once. */
    readonly channelGone: (
      channelId: ChannelId
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Deletes the conversations whose last message was sent before
     * `keptSince`, with what they hold, `limit` at most. Answers how many.
     */
    readonly purge: (
      keptSince: DateTime.Utc,
      limit: number
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/engagement/application/MessageStore") {}
