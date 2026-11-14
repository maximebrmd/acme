import { DateTime, Duration, Option, Schema } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { storableLine } from "#shared/domain/platform-text.ts";

import { ConversationIdSchema } from "./conversation-id.ts";
import type { ConversationId } from "./conversation-id.ts";
import { maxPlatformIdLength, MessageReadingSchema } from "./direct-message.ts";
import type { DirectMessage } from "./direct-message.ts";
import type { MessageBox } from "./message-box.ts";

/**
 * How long a conversation is kept after its last message: 30 days, then
 * it is deleted with every message it holds (the owner's decision, the
 * comments' rule). A channel disconnected, a workspace erased or the
 * platform deleting a message removes it at once.
 */
export const conversationsKeptFor = Duration.days(30);

/**
 * How often a conversation is read back whole even when the platform says
 * it did not change: a message deleted there, which may leave its
 * revision as it was, is then deleted in Peal within a day.
 */
export const checkedEvery = Duration.days(1);

/** The longest name or handle Peal keeps of a participant. */
export const maxParticipantNameLength = 200;

/** The most participants Peal keeps of a conversation. */
export const maxParticipants = 50;

/** A conversation's id on its platform: a Mastodon conversation, a Bluesky convo. */
export const PlatformConversationIdSchema = Schema.NonEmptyString.check(
  Schema.isMaxLength(maxPlatformIdLength)
);

/**
 * Another account in a conversation: its id on the platform, its handle,
 * and the name it shows (none when it shows none). Nothing more of it.
 */
export const ParticipantSchema = Schema.Struct({
  displayName: Schema.Option(Schema.String),
  handle: Schema.String,
  platformId: Schema.NonEmptyString,
});

export type Participant = typeof ParticipantSchema.Type;

/**
 * A conversation as a read of its platform found it: its id there, the
 * other accounts in it, what the platform says changes with every new
 * message (`revision`: Bluesky's `rev`, Mastodon's last status), whether
 * the account has yet to accept it (`request`: Bluesky's message requests
 * from accounts it does not follow), when its latest message was sent,
 * and its messages back to the read's start: all of them when `complete`,
 * with the ids of those the platform says were deleted.
 */
export const ConversationReadingSchema = Schema.Struct({
  complete: Schema.Boolean,
  deleted: Schema.Array(Schema.String),
  lastMessageAt: Schema.DateTimeUtc,
  messages: Schema.Array(MessageReadingSchema),
  participants: Schema.Array(ParticipantSchema),
  platformConversationId: PlatformConversationIdSchema,
  request: Schema.Boolean,
  revision: Schema.String,
});

export type ConversationReading = typeof ConversationReadingSchema.Type;

/**
 * A private conversation between a channel's account and one or more
 * other accounts, as Peal keeps it: who is in it, the revision it was last
 * read at, when its latest message was sent, when the latest from someone
 * else was (`lastIncomingAt`), and when a member last read or answered it
 * (`readAt`). It is the workspace's correspondence, kept for the
 * workspace: shown to its members, answered by them, never read by staff
 * nor given to an assistant.
 */
export class Conversation extends Schema.Class<Conversation>(
  "peal-server/engagement/domain/Conversation"
)({
  channelId: ChannelIdSchema,
  // When its messages were last read back whole from the platform.
  checkedAt: Schema.Option(Schema.DateTimeUtc),
  createdAt: Schema.DateTimeUtc,
  id: ConversationIdSchema,
  lastIncomingAt: Schema.Option(Schema.DateTimeUtc),
  lastMessageAt: Schema.DateTimeUtc,
  participants: Schema.Array(ParticipantSchema),
  platformConversationId: PlatformConversationIdSchema,
  readAt: Schema.Option(Schema.DateTimeUtc),
  request: Schema.Boolean,
  revision: Schema.String,
  workspaceId: WorkspaceIdSchema,
}) {}

type Fields = ConstructorParameters<typeof Conversation>[0];

const withFields = (
  conversation: Conversation,
  changed: Partial<Fields>
): Conversation =>
  new Conversation({
    channelId: conversation.channelId,
    checkedAt: conversation.checkedAt,
    createdAt: conversation.createdAt,
    id: conversation.id,
    lastIncomingAt: conversation.lastIncomingAt,
    lastMessageAt: conversation.lastMessageAt,
    participants: conversation.participants,
    platformConversationId: conversation.platformConversationId,
    readAt: conversation.readAt,
    request: conversation.request,
    revision: conversation.revision,
    workspaceId: conversation.workspaceId,
    ...changed,
  });

/** A participant as it can be kept: one line each, bounded. */
const storableParticipant = (participant: Participant): Participant => ({
  displayName: participant.displayName.pipe(
    Option.map((name) => storableLine(name, maxParticipantNameLength)),
    Option.filter((name) => name !== "")
  ),
  handle: storableLine(participant.handle, maxParticipantNameLength),
  platformId: storableLine(participant.platformId, maxPlatformIdLength),
});

/** The participants as they can be kept, those without an id left out. */
export const storableParticipants = (
  participants: readonly Participant[]
): readonly Participant[] =>
  participants
    .flatMap((participant) => {
      const kept = storableParticipant(participant);

      return kept.platformId === "" ? [] : [kept];
    })
    .slice(0, maxParticipants);

/** The instant before which a conversation's last message is no longer kept, at `now`. */
export const conversationsKeptSince = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtractDuration(now, conversationsKeptFor);

/** Whether a conversation whose last message was sent at `at` is still kept at `now`. */
export const isConversationKept = (
  at: DateTime.Utc,
  now: DateTime.Utc
): boolean => DateTime.isGreaterThanOrEqualTo(at, conversationsKeptSince(now));

/** A conversation a first read found, kept as of `now`. */
export const startConversation = (
  id: ConversationId,
  box: Pick<MessageBox, "channelId" | "workspaceId">,
  reading: ConversationReading,
  now: DateTime.Utc
): Conversation =>
  new Conversation({
    channelId: box.channelId,
    checkedAt: Option.some(now),
    createdAt: now,
    id,
    lastIncomingAt: Option.none(),
    lastMessageAt: reading.lastMessageAt,
    participants: storableParticipants(reading.participants),
    platformConversationId: storableLine(
      reading.platformConversationId,
      maxPlatformIdLength
    ),
    readAt: Option.none(),
    request: reading.request,
    revision: storableLine(reading.revision, maxPlatformIdLength),
    workspaceId: box.workspaceId,
  });

const latestOf = (
  instants: readonly DateTime.Utc[]
): Option.Option<DateTime.Utc> => {
  let latest = Option.none<DateTime.Utc>();

  for (const instant of instants) {
    latest = Option.some(
      Option.match(latest, {
        onNone: () => instant,
        onSome: (before) =>
          DateTime.isGreaterThan(instant, before) ? instant : before,
      })
    );
  }

  return latest;
};

/**
 * The conversation as a read found it, with the messages it keeps now:
 * who is in it, its revision and whether it is a request are the
 * platform's; its latest message and the latest from someone else are
 * what it keeps, or what the platform says when it keeps none newer.
 */
export const refreshConversation = (
  conversation: Conversation,
  reading: ConversationReading,
  kept: readonly DirectMessage[],
  now: DateTime.Utc
): Conversation => {
  const incoming = latestOf(
    kept.flatMap((message) => (message.fromAccount ? [] : [message.sentAt]))
  );

  const latest = latestOf([
    reading.lastMessageAt,
    ...kept.map(({ sentAt }) => sentAt),
  ]);

  return withFields(conversation, {
    checkedAt: Option.some(now),
    lastIncomingAt: Option.orElse(incoming, () => conversation.lastIncomingAt),
    lastMessageAt: Option.getOrElse(latest, () => reading.lastMessageAt),
    participants: storableParticipants(reading.participants),
    request: reading.request,
    revision: storableLine(reading.revision, maxPlatformIdLength),
  });
};

/** Whether a read must fetch the conversation's messages: it changed since it was read. */
export const changedSince = (
  conversation: Conversation,
  reading: ConversationReading
): boolean =>
  conversation.revision !== storableLine(reading.revision, maxPlatformIdLength);

/**
 * Whether someone wrote since a member last read or answered the
 * conversation.
 */
export const isUnread = (conversation: Conversation): boolean =>
  Option.exists(conversation.lastIncomingAt, (incoming) =>
    Option.match(conversation.readAt, {
      onNone: () => true,
      onSome: (read) => DateTime.isGreaterThan(incoming, read),
    })
  );

/**
 * The conversation once a member read it, or answered it, at `at`: or
 * unread again (`read` false), from its latest message on.
 */
export const markConversationRead = (
  conversation: Conversation,
  read: boolean,
  at: DateTime.Utc
): Conversation =>
  withFields(conversation, { readAt: read ? Option.some(at) : Option.none() });

/** The conversation once the account accepted it on the platform. */
export const acceptConversation = (conversation: Conversation): Conversation =>
  withFields(conversation, { request: false });

/**
 * Whether a read must fetch the conversation's messages whatever its
 * revision says: it was not read back whole for `checkedEvery`.
 */
export const dueForCheck = (
  conversation: Conversation,
  now: DateTime.Utc
): boolean =>
  !Option.exists(conversation.checkedAt, (checked) =>
    DateTime.isGreaterThan(
      checked,
      DateTime.subtractDuration(now, checkedEvery)
    )
  );

/** The conversation once a message was sent to it from Peal at `at`. */
export const answeredAt = (
  conversation: Conversation,
  at: DateTime.Utc
): Conversation =>
  withFields(conversation, {
    lastMessageAt: DateTime.isGreaterThan(at, conversation.lastMessageAt)
      ? at
      : conversation.lastMessageAt,
    readAt: Option.some(at),
  });
