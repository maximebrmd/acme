import type { DateTime, Effect, Option } from "effect";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import type {
  MessagesBatch,
  MessagesReadFailure,
} from "#engagement/application/ports/message-source.ts";
import type { Participant } from "#engagement/domain/conversation.ts";
import type { OutgoingMessageId } from "#engagement/domain/outgoing-message-id.ts";
import type { MessageSendOutcome } from "#engagement/domain/outgoing-message.ts";

/** What a read of a channel's conversations knows already. */
export interface MessagesToRead {
  /**
   * The revision Peal holds of each conversation it keeps, by the
   * platform's id: one whose revision did not change is not read again.
   */
  readonly known: ReadonlyMap<string, string>;
  /** The oldest message Peal may keep. */
  readonly keptSince: DateTime.Utc;
  /**
   * The ids on the platform of the messages Peal keeps of a conversation,
   * by its id there: what a whole read that does not show one asks after,
   * where a deletion can make part of a thread look whole (Mastodon).
   * None when the database did not answer: the read is then not whole,
   * so nothing is taken for deleted.
   */
  readonly keptOf?: (
    platformConversationId: string
  ) => Effect.Effect<Option.Option<readonly string[]>>;
}

/** A message about to go out, read from its journal row. */
export interface OutgoingDirect {
  /** When it was written: with its id, what every run derives keys from. */
  readonly createdAt: DateTime.Utc;
  /**
   * The latest message of the conversation Peal keeps, on the platform:
   * what a Mastodon status answers, so it joins the conversation.
   */
  readonly latestPlatformId: Option.Option<string>;
  readonly messageId: OutgoingMessageId;
  /** The other accounts in the conversation. */
  readonly participants: readonly Participant[];
  /** The conversation, on the platform. */
  readonly platformConversationId: string;
  /** Whether the account has yet to accept the conversation (Bluesky). */
  readonly request: boolean;
  /**
   * The platform's ids of the conversation's other messages sent from
   * Peal and of the account's messages Peal read: a resume never takes
   * one of them for this one.
   */
  readonly takenIds: readonly string[];
  readonly text: string;
}

/**
 * One platform's direct messages: reading an account's conversations, and
 * answering one as the account. A platform joins by implementing this,
 * with its entry in `InboxMessagePlatformSchema` and `messageAbilitiesOf`.
 *
 * `send` makes the one request that puts the message out, and answers
 * `unconfirmed` whenever that request may have left without an answer.
 * `resume` first asks the platform whether the message is there, and
 * sends only when the platform proves it is not.
 */
export interface MessagePlatform {
  readonly read: (
    account: ChannelAccount,
    request: MessagesToRead
  ) => Effect.Effect<MessagesBatch, MessagesReadFailure>;
  readonly send: (
    account: ChannelAccount,
    message: OutgoingDirect
  ) => Effect.Effect<MessageSendOutcome>;
  readonly resume: (
    account: ChannelAccount,
    message: OutgoingDirect
  ) => Effect.Effect<MessageSendOutcome>;
}
