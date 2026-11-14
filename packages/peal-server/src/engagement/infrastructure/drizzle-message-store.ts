import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  notInArray,
  or,
  sql as drizzleSql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest } from "effect/crypto";
import { SqlClient } from "effect/sql";

import { MessageStore } from "#engagement/application/ports/message-store.ts";
import type {
  ConversationCursor,
  ConversationFilter,
  ConversationSummary,
  MessageCursor,
  MessageJournalled,
  MessageKey,
  MessagesApplication,
  MessagesSwitchedOn,
} from "#engagement/application/ports/message-store.ts";
import { Conversation } from "#engagement/domain/conversation.ts";
import { DirectMessage } from "#engagement/domain/direct-message.ts";
import { MessageBox } from "#engagement/domain/message-box.ts";
import { OutgoingMessageIdSchema } from "#engagement/domain/outgoing-message-id.ts";
import { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";
import type { OutgoingMessageStatus } from "#engagement/domain/outgoing-message.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import {
  ChannelIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { holdFollowingLock } from "./following-lock.ts";
import {
  conversations,
  directMessages,
  erasedWorkspaces,
  messageApplications,
  messageBoxes,
  messageChannels,
  outgoingMessages,
} from "./schema.ts";

type BoxRow = typeof messageBoxes.$inferSelect;

type ConversationRow = typeof conversations.$inferSelect;

type MessageRow = typeof directMessages.$inferSelect;

type OutgoingRow = typeof outgoingMessages.$inferSelect;

// Rows are decoded with the domain's schemas, so a row the domain could
// not have written fails loudly instead of being trusted.
const decodeBox = Schema.decodeUnknownEffect(MessageBox);
const decodeConversation = Schema.decodeUnknownEffect(Conversation);
const decodeMessage = Schema.decodeUnknownEffect(DirectMessage);
const decodeOutgoing = Schema.decodeUnknownEffect(OutgoingMessage);
const decodeOutgoingId = Schema.decodeUnknownEffect(OutgoingMessageIdSchema);

const utc = (value: Date | null) =>
  value === null ? undefined : DateTime.fromDateUnsafe(value);

const instant = (value: Date | null) => Option.fromUndefinedOr(utc(value));

const date = (at: DateTime.Utc) => DateTime.toDateUtc(at);

const nullableDate = (at: Option.Option<DateTime.Utc>) =>
  at.pipe(Option.map(date), Option.getOrNull);

const iso = (at: Option.Option<DateTime.Utc>) =>
  at.pipe(Option.map(DateTime.formatIso), Option.getOrNull);

const failed = (cause: unknown) => new DatabaseError({ cause });

const boxOf = (row: BoxRow) =>
  decodeBox({
    channelId: row.channelId,
    createdAt: utc(row.createdAt),
    lastReadAt: instant(row.lastReadAt),
    nextReadAt: utc(row.nextReadAt),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const boxRowOf = (box: MessageBox) => ({
  channelId: box.channelId,
  createdAt: date(box.createdAt),
  lastReadAt: nullableDate(box.lastReadAt),
  nextReadAt: date(box.nextReadAt),
  workspaceId: box.workspaceId,
});

// Participants are stored as the domain encodes them: an Option is
// `{ _tag, value }` in JSON, read back by the same schema.
const conversationOf = (row: ConversationRow) =>
  Effect.gen(function* decoding() {
    const participants = yield* Schema.decodeUnknownEffect(
      Schema.toCodecJson(Conversation.fields.participants)
    )(row.participants);

    return yield* decodeConversation({
      channelId: row.channelId,
      checkedAt: instant(row.checkedAt),
      createdAt: utc(row.createdAt),
      id: row.id,
      lastIncomingAt: instant(row.lastIncomingAt),
      lastMessageAt: utc(row.lastMessageAt),
      participants,
      platformConversationId: row.platformConversationId,
      readAt: instant(row.readAt),
      request: row.request,
      revision: row.revision,
      workspaceId: row.workspaceId,
    });
  }).pipe(Effect.orDie);

const encodeParticipantsJson = Schema.encodeSync(
  Schema.toCodecJson(Conversation.fields.participants)
);

const conversationRowOf = (conversation: Conversation) => ({
  channelId: conversation.channelId,
  checkedAt: nullableDate(conversation.checkedAt),
  createdAt: date(conversation.createdAt),
  id: conversation.id,
  lastIncomingAt: nullableDate(conversation.lastIncomingAt),
  lastMessageAt: date(conversation.lastMessageAt),
  participants: encodeParticipantsJson(conversation.participants),
  platformConversationId: conversation.platformConversationId,
  readAt: nullableDate(conversation.readAt),
  request: conversation.request,
  revision: conversation.revision,
  workspaceId: conversation.workspaceId,
});

const messageOf = (row: MessageRow) =>
  decodeMessage({
    attachments: row.attachments,
    channelId: row.channelId,
    conversationId: row.conversationId,
    fromAccount: row.fromAccount,
    id: row.id,
    platformMessageId: row.platformMessageId,
    receivedAt: utc(row.receivedAt),
    senderPlatformId: Option.fromNullOr(row.senderPlatformId),
    sentAt: utc(row.sentAt),
    text: row.text,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const messageRowOf = (message: DirectMessage) => ({
  attachments: message.attachments,
  channelId: message.channelId,
  conversationId: message.conversationId,
  fromAccount: message.fromAccount,
  id: message.id,
  platformMessageId: message.platformMessageId,
  receivedAt: date(message.receivedAt),
  senderPlatformId: Option.getOrNull(message.senderPlatformId),
  sentAt: date(message.sentAt),
  text: message.text,
  workspaceId: message.workspaceId,
});

const statusOf = (row: OutgoingRow) => {
  if (row.status === "sending") {
    return { _tag: "sending", attemptedAt: instant(row.attemptedAt) };
  }

  if (row.status === "sent") {
    return {
      _tag: "sent",
      at: utc(row.settledAt),
      platformMessageId: Option.fromNullOr(row.platformMessageId),
    };
  }

  return { _tag: row.status, at: utc(row.settledAt), reason: row.reason };
};

const outgoingOfRow = (row: OutgoingRow) =>
  decodeOutgoing({
    authorId: Option.fromNullOr(row.authorId),
    channelId: row.channelId,
    conversationId: row.conversationId,
    createdAt: utc(row.createdAt),
    id: row.id,
    status: statusOf(row),
    text: row.text,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const statusColumns = (status: OutgoingMessageStatus) => {
  switch (status._tag) {
    case "sending": {
      return {
        attemptedAt: iso(status.attemptedAt),
        platformMessageId: null,
        reason: null,
        settledAt: null,
      };
    }

    case "sent": {
      return {
        attemptedAt: null,
        platformMessageId: Option.getOrNull(status.platformMessageId),
        reason: null,
        settledAt: DateTime.formatIso(status.at),
      };
    }

    case "failed":
    case "unconfirmed": {
      return {
        attemptedAt: null,
        platformMessageId: null,
        reason: status.reason,
        settledAt: DateTime.formatIso(status.at),
      };
    }

    default: {
      return status satisfies never;
    }
  }
};

// Whether someone wrote since a member last read the conversation, as
// `isUnread` decides it.
const unread = drizzleSql<boolean>`(${conversations.lastIncomingAt} IS NOT NULL AND (${conversations.readAt} IS NULL OR ${conversations.lastIncomingAt} > ${conversations.readAt}))`;

const filtered = (workspaceId: WorkspaceId, filter: ConversationFilter) =>
  and(
    eq(conversations.workspaceId, workspaceId),
    filter.channelId.pipe(
      Option.map((channelId) => eq(conversations.channelId, channelId)),
      Option.getOrUndefined
    ),
    filter.unread ? unread : undefined
  );

const afterCursor = (cursor: ConversationCursor) =>
  drizzleSql`(${conversations.lastMessageAt}, ${conversations.id}) < (${DateTime.formatIso(cursor.lastMessageAt)}::timestamptz, ${cursor.conversationId}::uuid)`;

// Named with its table: inside the subquery an unqualified `id` would be
// the message's own.
const messageCount = drizzleSql<number>`(SELECT count(*)::int FROM engagement.direct_messages AS message WHERE message.conversation_id = "conversations"."id")`;

const summaryOf = (row: {
  readonly conversation: ConversationRow;
  readonly messages: number;
}) =>
  conversationOf(row.conversation).pipe(
    Effect.map((conversation): ConversationSummary => ({
      conversation,
      messages: row.messages,
    }))
  );

/**
 * The MessageStore on the engagement schema. Deleting a conversation
 * deletes its messages and those sent from Peal, which reference it with
 * ON DELETE CASCADE; following takes the same advisory lock as comments
 * and reviews, so a workspace an erasure recorded is never followed
 * after.
 */
export const DrizzleMessageStore = Layer.effect(
  MessageStore,
  Effect.gen(function* DrizzleMessageStore() {
    const db = yield* Drizzle;
    const sql = yield* SqlClient.SqlClient;
    const digest = yield* Digest.Digest;

    const hashOf = (text: string) =>
      digest
        .digestHex(Digest.sha256, new TextEncoder().encode(text))
        .pipe(Effect.mapError(failed));

    // The message a key made in the workspace, compared with what comes
    // with the key now.
    const madeUnder = Effect.fn("MessageStore.madeUnder")(function* madeUnder(
      saved: OutgoingMessage,
      keyDigest: string
    ) {
      const [row] = yield* db
        .select()
        .from(outgoingMessages)
        .where(
          and(
            eq(outgoingMessages.workspaceId, saved.workspaceId),
            eq(outgoingMessages.keyDigest, keyDigest)
          )
        )
        .limit(1)
        .pipe(Effect.mapError(failed));

      if (row === undefined) {
        return Option.none<MessageJournalled>();
      }

      const earlier = yield* outgoingOfRow(row);

      const same =
        earlier.conversationId === saved.conversationId &&
        earlier.text === saved.text;

      return Option.some<MessageJournalled>(
        same ? { _tag: "replayed", message: earlier } : { _tag: "keyReused" }
      );
    });

    const followLocked = Effect.fn("MessageStore.followLocked")(
      function* followLocked(followed: readonly MessageBox[]) {
        yield* holdFollowingLock(sql);

        const erased = yield* db
          .select({ workspaceId: erasedWorkspaces.workspaceId })
          .from(erasedWorkspaces)
          .where(
            inArray(erasedWorkspaces.workspaceId, [
              ...new Set(followed.map(({ workspaceId }) => workspaceId)),
            ])
          );

        const gone = new Set(erased.map(({ workspaceId }) => workspaceId));

        const kept = followed.filter(
          ({ workspaceId }) => !gone.has(workspaceId)
        );

        if (kept.length === 0) {
          return 0;
        }

        const inserted = yield* db
          .insert(messageBoxes)
          .values(kept.map(boxRowOf))
          .onConflictDoNothing()
          .returning({ channelId: messageBoxes.channelId });

        return inserted.length;
      }
    );

    const follow = Effect.fn("MessageStore.follow")(function* follow(
      followed: readonly MessageBox[]
    ) {
      if (followed.length === 0) {
        return 0;
      }

      return yield* sql
        .withTransaction(followLocked(followed))
        .pipe(Effect.mapError(failed));
    });

    const due = Effect.fn("MessageStore.due")(function* due(
      at: DateTime.Utc,
      limit: number
    ) {
      const rows = yield* db
        .select()
        .from(messageBoxes)
        .where(lte(messageBoxes.nextReadAt, date(at)))
        .orderBy(asc(messageBoxes.nextReadAt), asc(messageBoxes.channelId))
        .limit(limit)
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(rows.map(boxOf));
    });

    const countDue = Effect.fn("MessageStore.countDue")(function* countDue(
      at: DateTime.Utc
    ) {
      const [row] = yield* db
        .select({ due: drizzleSql<number>`count(*)::int` })
        .from(messageBoxes)
        .where(lte(messageBoxes.nextReadAt, date(at)))
        .pipe(Effect.mapError(failed));

      return row?.due ?? 0;
    });

    const box = Effect.fn("MessageStore.box")(function* box(channelId: string) {
      const [row] = yield* db
        .select()
        .from(messageBoxes)
        .where(eq(messageBoxes.channelId, channelId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<MessageBox>()
        : Option.some(yield* boxOf(row));
    });

    const saveBox = (saved: MessageBox) =>
      db
        .update(messageBoxes)
        .set({
          lastReadAt: nullableDate(saved.lastReadAt),
          nextReadAt: date(saved.nextReadAt),
        })
        .where(eq(messageBoxes.channelId, saved.channelId))
        .pipe(Effect.asVoid, Effect.mapError(failed));

    const lockBox = (channelId: string) =>
      sql`
        SELECT 1 FROM engagement.message_boxes
        WHERE channel_id = ${channelId}::uuid
        FOR UPDATE
      `.pipe(Effect.asVoid, Effect.mapError(failed));

    const conversationsOf = Effect.fn("MessageStore.conversationsOf")(
      function* conversationsOf(channelId: string) {
        const rows = yield* db
          .select()
          .from(conversations)
          .where(eq(conversations.channelId, channelId))
          .orderBy(desc(conversations.lastMessageAt), desc(conversations.id))
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(conversationOf));
      }
    );

    const conversation = Effect.fn("MessageStore.conversation")(
      function* conversation(conversationId: string) {
        const [row] = yield* db
          .select({ conversation: conversations, messages: messageCount })
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1)
          .pipe(Effect.mapError(failed));

        return row === undefined
          ? Option.none<ConversationSummary>()
          : Option.some(yield* summaryOf(row));
      }
    );

    const listConversations = Effect.fn("MessageStore.listConversations")(
      function* listConversations(
        workspaceId: WorkspaceId,
        filter: ConversationFilter,
        page: {
          readonly after: Option.Option<ConversationCursor>;
          readonly limit: number;
        }
      ) {
        const rows = yield* db
          .select({ conversation: conversations, messages: messageCount })
          .from(conversations)
          .where(
            and(
              filtered(workspaceId, filter),
              page.after.pipe(Option.map(afterCursor), Option.getOrUndefined)
            )
          )
          .orderBy(desc(conversations.lastMessageAt), desc(conversations.id))
          .limit(page.limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(summaryOf));
      }
    );

    // New conversations are inserted, known ones replaced; one the channel
    // holds under another id is passed over, so two reads that met it
    // together keep it once.
    const saveConversations = Effect.fn("MessageStore.saveConversations")(
      function* saveConversations(saved: readonly Conversation[]) {
        if (saved.length === 0) {
          return [];
        }

        const known = new Set(
          (yield* db
            .select({ id: conversations.id })
            .from(conversations)
            .where(
              inArray(
                conversations.id,
                saved.map(({ id }) => id)
              )
            )
            .pipe(Effect.mapError(failed))).map(({ id }) => id)
        );

        const fresh = saved.filter(({ id }) => !known.has(id));

        const inserted =
          fresh.length === 0
            ? []
            : yield* db
                .insert(conversations)
                .values(fresh.map(conversationRowOf))
                .onConflictDoNothing()
                .returning({ id: conversations.id })
                .pipe(Effect.mapError(failed));

        yield* Effect.forEach(
          saved.filter(({ id }) => known.has(id)),
          (one) =>
            db
              .update(conversations)
              .set(conversationRowOf(one))
              .where(eq(conversations.id, one.id))
              .pipe(Effect.mapError(failed)),
          { discard: true }
        );

        const taken = new Set(inserted.map(({ id }) => id));

        return fresh.filter(({ id }) => taken.has(id));
      }
    );

    const messagesOf = Effect.fn("MessageStore.messagesOf")(
      function* messagesOf(conversationId: string) {
        const rows = yield* db
          .select()
          .from(directMessages)
          .where(eq(directMessages.conversationId, conversationId))
          .orderBy(asc(directMessages.sentAt), asc(directMessages.id))
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(messageOf));
      }
    );

    const saveMessages = Effect.fn("MessageStore.saveMessages")(
      function* saveMessages(saved: readonly DirectMessage[]) {
        if (saved.length === 0) {
          return [];
        }

        const known = new Set(
          (yield* db
            .select({ id: directMessages.id })
            .from(directMessages)
            .where(
              inArray(
                directMessages.id,
                saved.map(({ id }) => id)
              )
            )
            .pipe(Effect.mapError(failed))).map(({ id }) => id)
        );

        const fresh = saved.filter(({ id }) => !known.has(id));

        const inserted =
          fresh.length === 0
            ? []
            : yield* db
                .insert(directMessages)
                .values(fresh.map(messageRowOf))
                .onConflictDoNothing()
                .returning({ id: directMessages.id })
                .pipe(Effect.mapError(failed));

        yield* Effect.forEach(
          saved.filter(({ id }) => known.has(id)),
          (one) =>
            db
              .update(directMessages)
              .set({ attachments: one.attachments, text: one.text })
              .where(eq(directMessages.id, one.id))
              .pipe(Effect.mapError(failed)),
          { discard: true }
        );

        const taken = new Set(inserted.map(({ id }) => id));

        return fresh.filter(({ id }) => taken.has(id));
      }
    );

    const deleteMessages = (messageIds: readonly string[]) =>
      messageIds.length === 0
        ? Effect.void
        : db
            .delete(directMessages)
            .where(inArray(directMessages.id, [...messageIds]))
            .pipe(Effect.asVoid, Effect.mapError(failed));

    // Insert only, and only when the unique indexes allow it: one message
    // on its way or unconfirmed a conversation, one message a key. A
    // message whose conversation went is dropped: the insert selects its
    // conversation, and finds none.
    const journalMessage = Effect.fn("MessageStore.journalMessage")(
      function* journalMessage(
        saved: OutgoingMessage,
        key: Option.Option<MessageKey>
      ) {
        // The conversation's box first, as every deletion of its
        // conversations takes it before it lists what never set out: one
        // that runs meanwhile waits for this message, and gives back its
        // claim, or runs first, and the message finds its conversation gone.
        yield* sql`
          SELECT 1 FROM engagement.message_boxes
          WHERE channel_id = (
            SELECT channel_id FROM engagement.conversations
            WHERE id = ${saved.conversationId}::uuid
          )
          FOR UPDATE
        `.pipe(Effect.mapError(failed));

        const keyDigest = Option.isSome(key)
          ? yield* hashOf(key.value.key)
          : null;

        if (Option.isSome(key) && keyDigest !== null) {
          // A use of the key older than its lifetime is forgotten.
          yield* sql`
            UPDATE engagement.outgoing_messages SET key_digest = NULL
            WHERE workspace_id = ${saved.workspaceId}::uuid
              AND key_digest = ${keyDigest}
              AND created_at <= ${DateTime.formatIso(key.value.since)}::timestamptz
          `.pipe(Effect.mapError(failed));

          const made = yield* madeUnder(saved, keyDigest);

          if (Option.isSome(made)) {
            return made.value;
          }
        }

        const status = statusColumns(saved.status);

        const inserted = yield* sql`
          INSERT INTO engagement.outgoing_messages (
            id, conversation_id, workspace_id, channel_id, author_id, text,
            created_at, status, attempted_at, settled_at, reason, key_digest
          )
          SELECT ${saved.id}::uuid, conversation.id,
                 conversation.workspace_id, conversation.channel_id,
                 ${Option.getOrNull(saved.authorId)}::uuid, ${saved.text},
                 ${DateTime.formatIso(saved.createdAt)}::timestamptz,
                 ${saved.status._tag}, ${status.attemptedAt}::timestamptz,
                 ${status.settledAt}::timestamptz, ${status.reason}::text,
                 ${keyDigest}::text
          FROM engagement.conversations AS conversation
          WHERE conversation.id = ${saved.conversationId}::uuid
          ON CONFLICT DO NOTHING
          RETURNING id
        `.pipe(Effect.mapError(failed));

        if (inserted.length === 1) {
          const journalled: MessageJournalled = { _tag: "journalled" };

          return journalled;
        }

        // Refused: by the key, used by a request that came just before,
        // by a message to the conversation that is not settled, or the
        // conversation is gone.
        if (keyDigest !== null) {
          const made = yield* madeUnder(saved, keyDigest);

          if (Option.isSome(made)) {
            return made.value;
          }
        }

        const [pending] = yield* db
          .select({ id: outgoingMessages.id })
          .from(outgoingMessages)
          .where(
            and(
              eq(outgoingMessages.conversationId, saved.conversationId),
              inArray(outgoingMessages.status, ["sending", "unconfirmed"])
            )
          )
          .limit(1)
          .pipe(Effect.mapError(failed));

        const refused: MessageJournalled =
          pending === undefined
            ? { _tag: "dropped" }
            : {
                _tag: "pending",
                messageId: yield* decodeOutgoingId(pending.id).pipe(
                  Effect.orDie
                ),
              };

        return refused;
      }
    );

    const outgoing = Effect.fn("MessageStore.outgoing")(function* outgoing(
      messageId: string
    ) {
      const [row] = yield* db
        .select()
        .from(outgoingMessages)
        .where(eq(outgoingMessages.id, messageId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<OutgoingMessage>()
        : Option.some(yield* outgoingOfRow(row));
    });

    const outgoingOf = (conversationId: string) =>
      db
        .select()
        .from(outgoingMessages)
        .where(eq(outgoingMessages.conversationId, conversationId))
        .orderBy(asc(outgoingMessages.id))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) => Effect.all(rows.map(outgoingOfRow)))
        );

    // Only from the status it was read in, attempt included.
    const advanceMessage = Effect.fn("MessageStore.advanceMessage")(
      function* advanceMessage(next: OutgoingMessage, from: OutgoingMessage) {
        const status = statusColumns(next.status);
        const before = statusColumns(from.status);

        const moved = yield* sql`
          UPDATE engagement.outgoing_messages
          SET status = ${next.status._tag},
              attempted_at = ${status.attemptedAt}::timestamptz,
              settled_at = ${status.settledAt}::timestamptz,
              reason = ${status.reason}::text,
              platform_message_id = ${status.platformMessageId}::text
          WHERE id = ${next.id}::uuid
            AND status = ${from.status._tag}
            AND attempted_at IS NOT DISTINCT FROM ${before.attemptedAt}::timestamptz
          RETURNING id
        `.pipe(Effect.mapError(failed));

        return moved.length === 1;
      }
    );

    const claimCall = Effect.fn("MessageStore.claimCall")(function* claimCall(
      messageId: string,
      at: DateTime.Utc
    ) {
      const claimed = yield* sql`
        UPDATE engagement.outgoing_messages
        SET call_claimed_at = ${DateTime.formatIso(at)}::timestamptz
        WHERE id = ${messageId}::uuid AND status = 'sending'
        RETURNING id
      `.pipe(Effect.mapError(failed));

      return claimed.length === 1;
    });

    const strandedMessages = Effect.fn("MessageStore.strandedMessages")(
      function* strandedMessages(
        writtenBefore: DateTime.Utc,
        calledBefore: DateTime.Utc,
        limit: number
      ) {
        const rows = yield* db
          .select()
          .from(outgoingMessages)
          .where(
            and(
              eq(outgoingMessages.status, "sending"),
              lte(outgoingMessages.createdAt, date(writtenBefore)),
              or(
                isNull(outgoingMessages.callClaimedAt),
                lte(outgoingMessages.callClaimedAt, date(calledBefore))
              )
            )
          )
          .orderBy(asc(outgoingMessages.createdAt), asc(outgoingMessages.id))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(outgoingOfRow));
      }
    );

    const channelGone = Effect.fn("MessageStore.channelGone")(
      function* channelGone(channelId: string) {
        const deleted = yield* sql
          .withTransaction(
            Effect.gen(function* deleting() {
              yield* db
                .delete(messageChannels)
                .where(eq(messageChannels.channelId, channelId));

              yield* db
                .delete(messageBoxes)
                .where(eq(messageBoxes.channelId, channelId));

              return yield* db
                .delete(conversations)
                .where(eq(conversations.channelId, channelId))
                .returning({ id: conversations.id });
            })
          )
          .pipe(Effect.mapError(failed));

        return deleted.length;
      }
    );

    // Messages past their time first; then what Peal sent and settled
    // before it; then the conversations past their time that hold nothing
    // still on its way, so a message journalled keeps its claim's row.
    const purge = Effect.fn("MessageStore.purge")(function* purge(
      keptSince: DateTime.Utc,
      limit: number
    ) {
      const since = DateTime.formatIso(keptSince);

      const messages = yield* sql`
        DELETE FROM engagement.direct_messages
        WHERE id IN (
          SELECT id FROM engagement.direct_messages
          WHERE sent_at < ${since}::timestamptz
          ORDER BY sent_at
          LIMIT ${limit}
        )
        RETURNING id
      `.pipe(Effect.mapError(failed));

      yield* sql`
        DELETE FROM engagement.outgoing_messages
        WHERE id IN (
          SELECT id FROM engagement.outgoing_messages
          WHERE status IN ('sent', 'failed', 'unconfirmed')
            AND settled_at < ${since}::timestamptz
          ORDER BY settled_at
          LIMIT ${limit}
        )
      `.pipe(Effect.mapError(failed));

      const gone = yield* sql`
        DELETE FROM engagement.conversations
        WHERE id IN (
          SELECT conversation.id FROM engagement.conversations AS conversation
          WHERE conversation.last_message_at < ${since}::timestamptz
            AND NOT EXISTS (
              SELECT 1 FROM engagement.outgoing_messages AS pending
              WHERE pending.conversation_id = conversation.id
                AND pending.status IN ('sending', 'unconfirmed')
            )
          ORDER BY conversation.last_message_at
          LIMIT ${limit}
        )
        RETURNING id
      `.pipe(Effect.mapError(failed));

      return { conversations: gone.length, messages: messages.length };
    });

    const pageOfMessages = Effect.fn("MessageStore.pageOfMessages")(
      function* pageOfMessages(
        conversationId: string,
        page: {
          readonly before: Option.Option<MessageCursor>;
          readonly limit: number;
        }
      ) {
        const rows = yield* db
          .select()
          .from(directMessages)
          .where(
            and(
              eq(directMessages.conversationId, conversationId),
              page.before.pipe(
                Option.map(
                  (cursor) =>
                    drizzleSql`(${directMessages.sentAt}, ${directMessages.id}) < (${DateTime.formatIso(cursor.sentAt)}::timestamptz, ${cursor.messageId}::uuid)`
                ),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(desc(directMessages.sentAt), desc(directMessages.id))
          .limit(page.limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(messageOf));
      }
    );

    const unsentOf = Effect.fn("MessageStore.unsentOf")(function* unsentOf(
      channelId: string
    ) {
      // After the box, which a message being journalled holds: it is then
      // listed here, not deleted unseen.
      yield* lockBox(channelId);

      const rows = yield* db
        .select()
        .from(outgoingMessages)
        .where(
          and(
            eq(outgoingMessages.channelId, channelId),
            eq(outgoingMessages.status, "sending"),
            isNull(outgoingMessages.attemptedAt)
          )
        )
        // Locked until the transaction ends: a job that would begin one
        // waits, then finds it gone.
        .for("update")
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(rows.map(outgoingOfRow));
    });

    const switchedOn = Effect.fn("MessageStore.switchedOn")(
      function* switchedOn(workspaceId: string) {
        const rows = yield* db
          .select()
          .from(messageChannels)
          .where(eq(messageChannels.workspaceId, workspaceId))
          .orderBy(asc(messageChannels.enabledAt))
          .pipe(Effect.mapError(failed));

        return rows.map((row): MessagesSwitchedOn => ({
          channelId: ChannelIdSchema.make(row.channelId),
          enabledAt: DateTime.fromDateUnsafe(row.enabledAt),
          enabledBy: Option.fromNullOr(row.enabledBy).pipe(
            Option.map((id) => UserIdSchema.make(id))
          ),
          workspaceId: WorkspaceIdSchema.make(row.workspaceId),
        }));
      }
    );

    const switchOn = Effect.fn("MessageStore.switchOn")(function* switchOn(
      on: MessagesSwitchedOn,
      followed: MessageBox
    ) {
      yield* db
        .insert(messageChannels)
        .values({
          channelId: on.channelId,
          enabledAt: date(on.enabledAt),
          enabledBy: Option.getOrNull(on.enabledBy),
          workspaceId: on.workspaceId,
        })
        .onConflictDoNothing()
        .pipe(Effect.mapError(failed));

      yield* follow([followed]);
    });

    const applications = Effect.fn("MessageStore.applications")(
      function* applications(workspaceId: string) {
        const rows = yield* db
          .select()
          .from(messageApplications)
          .where(eq(messageApplications.workspaceId, workspaceId))
          .orderBy(asc(messageApplications.grantedAt))
          .pipe(Effect.mapError(failed));

        return rows.map((row): MessagesApplication => ({
          clientId: row.clientId,
          grantedAt: DateTime.fromDateUnsafe(row.grantedAt),
          grantedBy: Option.fromNullOr(row.grantedBy).pipe(
            Option.map((id) => UserIdSchema.make(id))
          ),
          workspaceId: WorkspaceIdSchema.make(row.workspaceId),
        }));
      }
    );

    const allowApplication = (allowed: MessagesApplication) =>
      db
        .insert(messageApplications)
        .values({
          clientId: allowed.clientId,
          grantedAt: date(allowed.grantedAt),
          grantedBy: Option.getOrNull(allowed.grantedBy),
          workspaceId: allowed.workspaceId,
        })
        .onConflictDoNothing()
        .pipe(Effect.asVoid, Effect.mapError(failed));

    const revokeApplication = (workspaceId: string, clientId: string) =>
      db
        .delete(messageApplications)
        .where(
          and(
            eq(messageApplications.workspaceId, workspaceId),
            eq(messageApplications.clientId, clientId)
          )
        )
        .pipe(Effect.asVoid, Effect.mapError(failed));

    const allows = Effect.fn("MessageStore.allows")(function* allows(
      workspaceId: string,
      clientId: string
    ) {
      const [row] = yield* db
        .select({ clientId: messageApplications.clientId })
        .from(messageApplications)
        .where(
          and(
            eq(messageApplications.workspaceId, workspaceId),
            eq(messageApplications.clientId, clientId)
          )
        )
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row !== undefined;
    });

    const clearUnlisted = (channelId: string, listed: readonly string[]) =>
      listed.length === 0
        ? Effect.void
        : db
            .update(conversations)
            .set({ unlistedAt: null })
            .where(
              and(
                eq(conversations.channelId, channelId),
                inArray(conversations.platformConversationId, [...listed]),
                isNotNull(conversations.unlistedAt)
              )
            )
            .pipe(Effect.asVoid, Effect.mapError(failed));

    const dropUnlisted = Effect.fn("MessageStore.dropUnlisted")(
      function* dropUnlisted(
        channelId: string,
        listed: readonly string[],
        at: DateTime.Utc
      ) {
        const shown = [...listed];

        // An empty listing says nothing of what the platform holds.
        if (shown.length === 0) {
          return 0;
        }

        // Under the box, which a message being journalled holds: its
        // conversation is then seen to have it on its way.
        yield* lockBox(channelId);

        // Shown again: no longer missed.
        yield* clearUnlisted(channelId, shown);

        // Missed by the whole listing before too: gone on the platform,
        // unless a message to it is on its way.
        const gone = yield* sql`
          DELETE FROM engagement.conversations AS conversation
          WHERE conversation.channel_id = ${channelId}
            AND conversation.unlisted_at IS NOT NULL
            AND conversation.platform_conversation_id NOT IN ${sql.in(shown)}
            AND NOT EXISTS (
              SELECT 1 FROM engagement.outgoing_messages AS pending
              WHERE pending.conversation_id = conversation.id
                AND pending.status IN ('sending', 'unconfirmed')
            )
          RETURNING conversation.id
        `.pipe(Effect.mapError(failed));

        // Missed for the first time: marked, and kept.
        yield* db
          .update(conversations)
          .set({ unlistedAt: DateTime.toDateUtc(at) })
          .where(
            and(
              eq(conversations.channelId, channelId),
              notInArray(conversations.platformConversationId, shown),
              isNull(conversations.unlistedAt)
            )
          )
          .pipe(Effect.mapError(failed));

        return gone.length;
      }
    );

    return MessageStore.of({
      advanceMessage,
      allowApplication,
      allows,
      applications,
      clearUnlisted,
      dropUnlisted,
      pageOfMessages,
      revokeApplication,
      switchedOn,
      switchOn,
      unsentOf,
      box,
      channelGone,
      claimCall,
      conversation,
      conversationsOf,
      countDue,
      deleteMessages,
      due,
      follow,
      journalMessage,
      listConversations,
      lockBox,
      messagesOf,
      outgoing,
      outgoingOf,
      purge,
      saveBox,
      saveConversations,
      saveMessages,
      strandedMessages,
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
