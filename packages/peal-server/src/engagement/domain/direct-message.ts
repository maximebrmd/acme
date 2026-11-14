import { DateTime, Option, Schema } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { storableLine, storableText } from "#shared/domain/platform-text.ts";

import { ConversationIdSchema } from "./conversation-id.ts";
import { DirectMessageIdSchema } from "./direct-message-id.ts";
import type { DirectMessageId } from "./direct-message-id.ts";

/** The longest message Peal keeps: what is past it is cut. */
export const maxMessageLength = 10_000;

/** The longest id Peal keeps of a message or an account on a platform. */
export const maxPlatformIdLength = 512;

/** A message's id on its platform: a Mastodon status, a Bluesky chat message. */
export const PlatformMessageIdSchema = Schema.NonEmptyString.check(
  Schema.isMaxLength(maxPlatformIdLength)
);

/**
 * A message of a conversation as a read of its platform found it: sent by
 * the channel's own account (`fromAccount`: from Peal or elsewhere) or by
 * someone else (`senderPlatformId`, their account on the platform), its
 * plain text, how many attachments it carries (never the attachments),
 * and when it was sent.
 */
export const MessageReadingSchema = Schema.Struct({
  attachments: Schema.Int,
  fromAccount: Schema.Boolean,
  platformMessageId: PlatformMessageIdSchema,
  senderPlatformId: Schema.Option(Schema.String),
  sentAt: Schema.DateTimeUtc,
  text: Schema.String,
});

export type MessageReading = typeof MessageReadingSchema.Type;

/**
 * A direct message, as its platform gave it. Messages are private
 * correspondence between the account and other people: Peal keeps them,
 * as the workspace's processor, to show them to its members and answer
 * them, and for nothing else. Never their text in a log, a trace, a
 * notice, a webhook event, the cluster's tables or an assistant's prompt.
 */
export class DirectMessage extends Schema.Class<DirectMessage>(
  "peal-server/engagement/domain/DirectMessage"
)({
  attachments: Schema.Int,
  channelId: ChannelIdSchema,
  conversationId: ConversationIdSchema,
  fromAccount: Schema.Boolean,
  id: DirectMessageIdSchema,
  platformMessageId: PlatformMessageIdSchema,
  // When Peal first read it.
  receivedAt: Schema.DateTimeUtc,
  // Who sent it on the platform; none for the account's own.
  senderPlatformId: Schema.Option(Schema.String),
  sentAt: Schema.DateTimeUtc,
  // Plain text; empty for a message of attachments alone.
  text: Schema.String,
  workspaceId: WorkspaceIdSchema,
}) {}

/**
 * A reading as it can be kept: well formed and bounded text, a sender id
 * on one line (none for the account's own message, or when nothing is
 * left of it), and no negative count.
 */
export const storableMessage = (reading: MessageReading): MessageReading => ({
  attachments: Math.max(0, Math.trunc(reading.attachments)),
  fromAccount: reading.fromAccount,
  platformMessageId: storableLine(
    reading.platformMessageId,
    maxPlatformIdLength
  ),
  senderPlatformId: reading.fromAccount
    ? Option.none()
    : reading.senderPlatformId.pipe(
        Option.map((id) => storableLine(id, maxPlatformIdLength)),
        Option.filter((id) => id !== "")
      ),
  sentAt: reading.sentAt,
  text: storableText(reading.text, maxMessageLength),
});

/** The message a read found for the first time, kept as of `now`. */
export const receiveMessage = (
  id: DirectMessageId,
  conversation: {
    readonly channelId: DirectMessage["channelId"];
    readonly id: DirectMessage["conversationId"];
    readonly workspaceId: DirectMessage["workspaceId"];
  },
  read: MessageReading,
  now: DateTime.Utc
): DirectMessage => {
  const reading = storableMessage(read);

  return new DirectMessage({
    attachments: reading.attachments,
    channelId: conversation.channelId,
    conversationId: conversation.id,
    fromAccount: reading.fromAccount,
    id,
    platformMessageId: reading.platformMessageId,
    receivedAt: now,
    senderPlatformId: reading.senderPlatformId,
    sentAt: reading.sentAt,
    text: reading.text,
    workspaceId: conversation.workspaceId,
  });
};

/** The message as a later read found it: its author may have edited it. */
export const refreshMessage = (
  message: DirectMessage,
  read: MessageReading
): DirectMessage => {
  const reading = storableMessage(read);

  return new DirectMessage({
    attachments: reading.attachments,
    channelId: message.channelId,
    conversationId: message.conversationId,
    fromAccount: message.fromAccount,
    id: message.id,
    platformMessageId: message.platformMessageId,
    receivedAt: message.receivedAt,
    senderPlatformId: message.senderPlatformId,
    sentAt: message.sentAt,
    text: reading.text,
    workspaceId: message.workspaceId,
  });
};

/** What a read changes in a conversation's messages. */
export interface MessagesReconciled {
  /** Messages read for the first time, still to be given an id. */
  readonly fresh: readonly MessageReading[];
  /** Messages kept before whose text changed on the platform. */
  readonly refreshed: readonly DirectMessage[];
  /** Messages kept before that the platform deleted: nothing is left of them. */
  readonly gone: readonly DirectMessageId[];
}

/**
 * The one place that decides what a read of a conversation changes. A
 * message the platform says was deleted (`deleted`, by its id there) goes
 * at once. Only a `complete` read, one that listed every message the
 * platform shows back to `readSince`, takes a message it did not see,
 * sent since then, for deleted; any read adds what is new and refreshes
 * what changed.
 */
export const reconcileMessages = (
  kept: readonly DirectMessage[],
  read: readonly MessageReading[],
  deleted: readonly string[],
  complete: boolean,
  readSince: DateTime.Utc
): MessagesReconciled => {
  const readings = new Map<string, MessageReading>();

  for (const raw of read) {
    const reading = storableMessage(raw);

    if (reading.platformMessageId !== "") {
      readings.set(reading.platformMessageId, reading);
    }
  }

  const removed = new Set(
    deleted.map((id) => storableLine(id, maxPlatformIdLength))
  );

  for (const id of removed) {
    readings.delete(id);
  }

  const known = new Set(kept.map((message) => message.platformMessageId));
  const refreshed: DirectMessage[] = [];
  const gone: DirectMessageId[] = [];

  for (const message of kept) {
    const reading = readings.get(message.platformMessageId);

    if (removed.has(message.platformMessageId)) {
      gone.push(message.id);
    } else if (reading !== undefined) {
      if (reading.text !== message.text) {
        refreshed.push(refreshMessage(message, reading));
      }
    } else if (
      complete &&
      DateTime.isGreaterThanOrEqualTo(message.sentAt, readSince)
    ) {
      gone.push(message.id);
    }
  }

  return {
    fresh: [...readings.values()].filter(
      (reading) => !known.has(reading.platformMessageId)
    ),
    gone,
    refreshed,
  };
};
