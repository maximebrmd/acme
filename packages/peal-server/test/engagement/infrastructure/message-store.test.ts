import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref, Result } from "effect";
import { SqlClient } from "effect/sql";

import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { MessageStore } from "#engagement/application/ports/message-store.ts";
import { ConversationIdSchema } from "#engagement/domain/conversation-id.ts";
import {
  markConversationRead,
  refreshConversation,
  startConversation,
} from "#engagement/domain/conversation.ts";
import type {
  Conversation,
  ConversationReading,
} from "#engagement/domain/conversation.ts";
import { DirectMessageIdSchema } from "#engagement/domain/direct-message-id.ts";
import { receiveMessage } from "#engagement/domain/direct-message.ts";
import type { MessageReading } from "#engagement/domain/direct-message.ts";
import { followBox, recordBoxRead } from "#engagement/domain/message-box.ts";
import type { MessageBox } from "#engagement/domain/message-box.ts";
import { OutgoingMessageIdSchema } from "#engagement/domain/outgoing-message-id.ts";
import {
  beginMessage,
  settleMessage,
  writeMessage,
} from "#engagement/domain/outgoing-message.ts";
import { DrizzleEngagementRecords } from "#engagement/infrastructure/drizzle-engagement-records.ts";
import { DrizzleMessageStore } from "#engagement/infrastructure/drizzle-message-store.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema, UserIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import {
  conversationReading,
  messageReading,
} from "#test/engagement/support.ts";
import { FakeMetersLedger, fakeMeters } from "#test/shared/support.ts";

// The Postgres store of direct messages, on the database DATABASE_URL
// names. Each test writes rows of its own workspace, at instants no other
// suite uses (2049; the retention in 1935), and deletes them after.

// The records give back the outbound message of what never set out, on
// meters that count in memory.
const StoreTest = Layer.mergeAll(
  DrizzleMessageStore,
  DrizzleEngagementRecords
).pipe(
  Layer.provideMerge(fakeMeters({ allowed: Option.none() })),
  Layer.provideMerge(DatabaseTest)
);

// What the meters were given back for the workspace.
const givenBackIn = (workspaceId: WorkspaceId) =>
  FakeMetersLedger.use(Ref.get).pipe(
    Effect.map(({ givenBack }) =>
      givenBack.filter((claim) => claim.workspaceId === workspaceId)
    )
  );

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const forget = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.all([
      sql`DELETE FROM engagement.conversations WHERE workspace_id = ${workspaceId}`,
      sql`DELETE FROM engagement.message_boxes WHERE workspace_id = ${workspaceId}`,
      sql`DELETE FROM engagement.message_channels WHERE workspace_id = ${workspaceId}`,
      sql`DELETE FROM engagement.message_applications WHERE workspace_id = ${workspaceId}`,
    ])
  ).pipe(Effect.orDie);

const boxOf = Effect.fn("boxOf")(function* boxOf(
  workspaceId: WorkspaceId,
  at: string
) {
  return followBox(
    { channelId: yield* newId(ChannelIdSchema), workspaceId },
    utc(at)
  );
});

const conversationOn = Effect.fn("conversationOn")(function* conversationOn(
  box: MessageBox,
  n: number,
  at: string,
  changed: Partial<ConversationReading> = {}
) {
  return startConversation(
    yield* newId(ConversationIdSchema),
    box,
    conversationReading(n, { lastMessageAt: utc(at), ...changed }),
    utc(at)
  );
});

const messageOn = Effect.fn("messageOn")(function* messageOn(
  conversation: Conversation,
  n: number,
  at: string,
  changed: Partial<MessageReading> = {}
) {
  return receiveMessage(
    yield* newId(DirectMessageIdSchema),
    conversation,
    messageReading(n, { sentAt: utc(at), ...changed }),
    utc(at)
  );
});

layer(StoreTest)("the message store", (it) => {
  it.effect("follows a channel once, and reads it when due", () =>
    Effect.gen(function* follows() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* MessageStore;
      const box = yield* boxOf(workspaceId, "2049-02-01T10:00:00.000Z");

      yield* Effect.gen(function* checks() {
        assert.strictEqual(yield* store.follow([box]), 1);
        assert.strictEqual(yield* store.follow([box]), 0);

        const due = yield* store.due(utc("2049-02-01T10:00:00.000Z"), 1000);

        assert.deepStrictEqual(
          due.filter(({ channelId }) => channelId === box.channelId),
          [box]
        );

        const read = recordBoxRead(
          box,
          Option.none(),
          utc("2049-02-01T10:01:00.000Z"),
          utc("2049-02-01T10:00:00.000Z")
        );

        yield* store.saveBox(read);

        assert.deepStrictEqual(
          yield* store.box(box.channelId),
          Option.some(read)
        );
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect(
    "keeps a conversation and its messages once, and lists it unread",
    () =>
      Effect.gen(function* keeps() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const box = yield* boxOf(workspaceId, "2049-02-02T10:00:00.000Z");

        yield* Effect.gen(function* checks() {
          yield* store.follow([box]);

          const started = yield* conversationOn(
            box,
            1,
            "2049-02-02T09:00:00.000Z"
          );

          assert.deepStrictEqual(yield* store.saveConversations([started]), [
            started,
          ]);

          // The same conversation read again under another id is passed over.
          const twin = yield* conversationOn(
            box,
            1,
            "2049-02-02T09:00:00.000Z"
          );

          assert.deepStrictEqual(yield* store.saveConversations([twin]), []);

          const first = yield* messageOn(
            started,
            1,
            "2049-02-02T09:00:00.000Z"
          );

          const own = yield* messageOn(started, 2, "2049-02-02T09:05:00.000Z", {
            fromAccount: true,
            senderPlatformId: Option.none(),
          });

          assert.deepStrictEqual(yield* store.saveMessages([first, own]), [
            first,
            own,
          ]);
          assert.deepStrictEqual(
            yield* store.saveMessages([
              yield* messageOn(started, 1, "2049-02-02T09:00:00.000Z"),
            ]),
            []
          );

          const refreshed = refreshConversation(
            started,
            conversationReading(1, {
              lastMessageAt: utc("2049-02-02T09:05:00.000Z"),
              revision: "r2",
            }),
            [first, own],
            utc("2049-02-02T09:06:00.000Z")
          );

          yield* store.saveConversations([refreshed]);

          const summary = yield* store.conversation(started.id);

          assert.deepStrictEqual(
            summary,
            Option.some({ conversation: refreshed, messages: 2 })
          );
          assert.deepStrictEqual(yield* store.messagesOf(started.id), [
            first,
            own,
          ]);

          const unread = yield* store.listConversations(
            workspaceId,
            { channelId: Option.none(), unread: true },
            { after: Option.none(), limit: 10 }
          );

          assert.deepStrictEqual(
            unread.map(({ conversation }) => conversation.id),
            [started.id]
          );

          yield* store.saveConversations([
            markConversationRead(
              refreshed,
              true,
              utc("2049-02-02T09:10:00.000Z")
            ),
          ]);

          assert.deepStrictEqual(
            yield* store.listConversations(
              workspaceId,
              { channelId: Option.none(), unread: true },
              { after: Option.none(), limit: 10 }
            ),
            []
          );

          yield* store.deleteMessages([first.id]);

          assert.deepStrictEqual(yield* store.messagesOf(started.id), [own]);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect("pages a workspace's conversations, latest message first", () =>
    Effect.gen(function* pages() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* MessageStore;
      const box = yield* boxOf(workspaceId, "2049-02-03T10:00:00.000Z");

      yield* Effect.gen(function* checks() {
        yield* store.follow([box]);

        const older = yield* conversationOn(box, 1, "2049-02-03T08:00:00.000Z");
        const newer = yield* conversationOn(box, 2, "2049-02-03T09:00:00.000Z");

        yield* store.saveConversations([older, newer]);

        const first = yield* store.listConversations(
          workspaceId,
          { channelId: Option.some(box.channelId), unread: false },
          { after: Option.none(), limit: 1 }
        );

        assert.deepStrictEqual(
          first.map(({ conversation }) => conversation.id),
          [newer.id]
        );

        const second = yield* store.listConversations(
          workspaceId,
          { channelId: Option.none(), unread: false },
          {
            after: Option.some({
              conversationId: newer.id,
              lastMessageAt: newer.lastMessageAt,
            }),
            limit: 10,
          }
        );

        assert.deepStrictEqual(
          second.map(({ conversation }) => conversation.id),
          [older.id]
        );
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect(
    "journals one message on its way a conversation, and one a key",
    () =>
      Effect.gen(function* journals() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const box = yield* boxOf(workspaceId, "2049-02-04T10:00:00.000Z");
        const at = utc("2049-02-04T10:00:00.000Z");
        const since = DateTime.subtractDuration(at, "24 hours");

        const authorId = UserIdSchema.make(
          "22222222-2222-4222-8222-222222222222"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([box]);

          const talk = yield* conversationOn(
            box,
            1,
            "2049-02-04T09:00:00.000Z"
          );

          yield* store.saveConversations([talk]);

          const message = writeMessage(
            yield* newId(OutgoingMessageIdSchema),
            talk,
            Option.some(authorId),
            "Thanks!",
            at
          );

          const key = Option.some({ key: "synthetic-key-1", since });

          assert.deepStrictEqual(yield* store.journalMessage(message, key), {
            _tag: "journalled",
          });

          // Sent again with its key: the same message, none other.
          const again = writeMessage(
            yield* newId(OutgoingMessageIdSchema),
            talk,
            Option.some(authorId),
            "Thanks!",
            at
          );

          assert.deepStrictEqual(yield* store.journalMessage(again, key), {
            _tag: "replayed",
            message,
          });

          const otherText = writeMessage(
            yield* newId(OutgoingMessageIdSchema),
            talk,
            Option.some(authorId),
            "Another",
            at
          );

          assert.deepStrictEqual(yield* store.journalMessage(otherText, key), {
            _tag: "keyReused",
          });
          assert.deepStrictEqual(
            yield* store.journalMessage(otherText, Option.none()),
            { _tag: "pending", messageId: message.id }
          );

          // Settled, the conversation takes the next.
          const begun = Result.getOrThrow(beginMessage(message, at));

          assert.isTrue(yield* store.advanceMessage(begun, message));
          assert.isFalse(yield* store.advanceMessage(begun, message));
          assert.isTrue(yield* store.claimCall(message.id, at));

          const sent = Result.getOrThrow(
            settleMessage(begun, { _tag: "sent", platformMessageId: "m9" }, at)
          );

          assert.isTrue(yield* store.advanceMessage(sent, begun));
          assert.isFalse(yield* store.claimCall(message.id, at));
          assert.deepStrictEqual(
            yield* store.outgoing(message.id),
            Option.some(sent)
          );
          assert.deepStrictEqual(
            yield* store.journalMessage(otherText, Option.none()),
            { _tag: "journalled" }
          );
          assert.deepStrictEqual(
            (yield* store.outgoingOf(talk.id)).map(({ id }) => id),
            [message.id, otherText.id]
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "drops a message whose conversation went, and finds the stranded",
    () =>
      Effect.gen(function* drops() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const box = yield* boxOf(workspaceId, "2049-02-05T10:00:00.000Z");
        const at = utc("2049-02-05T10:00:00.000Z");

        yield* Effect.gen(function* checks() {
          yield* store.follow([box]);

          const talk = yield* conversationOn(
            box,
            1,
            "2049-02-05T09:00:00.000Z"
          );

          const gone = yield* conversationOn(
            box,
            2,
            "2049-02-05T09:00:00.000Z"
          );

          yield* store.saveConversations([talk]);

          assert.deepStrictEqual(
            yield* store.journalMessage(
              writeMessage(
                yield* newId(OutgoingMessageIdSchema),
                gone,
                Option.none(),
                "Hello",
                at
              ),
              Option.none()
            ),
            { _tag: "dropped" }
          );

          const waiting = writeMessage(
            yield* newId(OutgoingMessageIdSchema),
            talk,
            Option.none(),
            "Hello",
            at
          );

          yield* store.journalMessage(waiting, Option.none());

          const stranded = yield* store.strandedMessages(
            DateTime.addDuration(at, "1 hour"),
            DateTime.addDuration(at, "1 hour"),
            1000
          );

          assert.isTrue(stranded.some(({ id }) => id === waiting.id));
          assert.strictEqual(yield* store.channelGone(box.channelId), 1);
          assert.deepStrictEqual(
            yield* store.outgoing(waiting.id),
            Option.none()
          );
          assert.deepStrictEqual(
            yield* store.box(box.channelId),
            Option.none()
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "deletes each message 30 days after it was sent, and a conversation once its last message is that old",
    () =>
      Effect.gen(function* purges() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const box = yield* boxOf(workspaceId, "1935-03-01T10:00:00.000Z");

        yield* Effect.gen(function* checks() {
          yield* store.follow([box]);

          const old = yield* conversationOn(box, 1, "1935-01-01T10:00:00.000Z");

          const active = yield* conversationOn(
            box,
            2,
            "1935-02-15T10:00:00.000Z"
          );

          yield* store.saveConversations([old, active]);

          const stale = yield* messageOn(active, 1, "1935-01-01T10:00:00.000Z");
          const fresh = yield* messageOn(active, 2, "1935-02-15T10:00:00.000Z");

          yield* store.saveMessages([stale, fresh]);

          const purged = yield* store.purge(
            utc("1935-01-30T10:00:00.000Z"),
            1000
          );

          assert.isAtLeast(purged.conversations, 1);
          assert.isAtLeast(purged.messages, 1);
          assert.deepStrictEqual(
            yield* store.conversation(old.id),
            Option.none()
          );
          assert.deepStrictEqual(
            (yield* store.messagesOf(active.id)).map(({ id }) => id),
            [fresh.id]
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "keeps a conversation past its time while a message to it is on its way",
    () =>
      Effect.gen(function* pending() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const box = yield* boxOf(workspaceId, "1935-04-01T10:00:00.000Z");

        yield* Effect.gen(function* checks() {
          yield* store.follow([box]);

          const talk = yield* conversationOn(
            box,
            1,
            "1935-03-01T10:00:00.000Z"
          );

          yield* store.saveConversations([talk]);
          yield* store.journalMessage(
            writeMessage(
              yield* newId(OutgoingMessageIdSchema),
              talk,
              Option.none(),
              "Hello",
              utc("1935-03-31T10:00:00.000Z")
            ),
            Option.none()
          );

          yield* store.purge(utc("1935-03-30T10:00:00.000Z"), 1000);

          assert.isTrue(Option.isSome(yield* store.conversation(talk.id)));
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "deletes a message left unconfirmed once it settled as long ago as Peal keeps, and then its conversation",
    () =>
      Effect.gen(function* unconfirmed() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const box = yield* boxOf(workspaceId, "1935-05-01T10:00:00.000Z");
        const at = utc("1935-04-01T10:00:00.000Z");

        yield* Effect.gen(function* checks() {
          yield* store.follow([box]);

          const talk = yield* conversationOn(
            box,
            1,
            "1935-04-01T09:00:00.000Z"
          );

          yield* store.saveConversations([talk]);

          const message = writeMessage(
            yield* newId(OutgoingMessageIdSchema),
            talk,
            Option.none(),
            "Hello",
            at
          );

          yield* store.journalMessage(message, Option.none());

          const begun = Result.getOrThrow(beginMessage(message, at));

          yield* store.advanceMessage(begun, message);
          yield* store.advanceMessage(
            Result.getOrThrow(
              settleMessage(
                begun,
                { _tag: "unconfirmed", reason: "interrupted" },
                at
              )
            ),
            begun
          );

          yield* store.purge(utc("1935-05-02T10:00:00.000Z"), 1000);

          assert.deepStrictEqual(
            yield* store.outgoing(message.id),
            Option.none()
          );
          assert.deepStrictEqual(
            yield* store.conversation(talk.id),
            Option.none()
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "deletes a conversation only once two whole listings in a row miss it",
    () =>
      Effect.gen(function* listings() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const box = yield* boxOf(workspaceId, "2049-02-10T10:00:00.000Z");
        const at = utc("2049-02-10T10:00:00.000Z");

        yield* Effect.gen(function* checks() {
          yield* store.follow([box]);

          const kept = yield* conversationOn(
            box,
            1,
            "2049-02-10T09:00:00.000Z"
          );

          const other = yield* conversationOn(
            box,
            2,
            "2049-02-10T09:00:00.000Z"
          );

          yield* store.saveConversations([kept, other]);

          assert.strictEqual(
            yield* store.dropUnlisted(box.channelId, [], at),
            0
          );
          assert.strictEqual(
            yield* store.dropUnlisted(box.channelId, ["c2"], at),
            0
          );
          // Listed again in between: the miss is forgotten.
          yield* store.dropUnlisted(box.channelId, ["c1", "c2"], at);
          assert.strictEqual(
            yield* store.dropUnlisted(box.channelId, ["c2"], at),
            0
          );
          assert.strictEqual(
            yield* store.dropUnlisted(box.channelId, ["c2"], at),
            1
          );
          assert.deepStrictEqual(
            yield* store.conversation(kept.id),
            Option.none()
          );
          assert.isTrue(Option.isSome(yield* store.conversation(other.id)));
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect("pages a conversation's messages, the latest first", () =>
    Effect.gen(function* pages() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* MessageStore;
      const box = yield* boxOf(workspaceId, "2049-03-01T10:00:00.000Z");

      yield* Effect.gen(function* checks() {
        yield* store.follow([box]);

        const talk = yield* conversationOn(box, 1, "2049-03-01T09:00:00.000Z");

        yield* store.saveConversations([talk]);

        const first = yield* messageOn(talk, 1, "2049-03-01T08:00:00.000Z");
        const second = yield* messageOn(talk, 2, "2049-03-01T09:00:00.000Z");

        yield* store.saveMessages([first, second]);

        assert.deepStrictEqual(
          yield* store.pageOfMessages(talk.id, {
            before: Option.none(),
            limit: 1,
          }),
          [second]
        );
        assert.deepStrictEqual(
          yield* store.pageOfMessages(talk.id, {
            before: Option.some({
              messageId: second.id,
              sentAt: second.sentAt,
            }),
            limit: 10,
          }),
          [first]
        );
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect(
    "turns a channel's messages on, lets applications in, and deletes what whole listings no longer show",
    () =>
      Effect.gen(function* settings() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const box = yield* boxOf(workspaceId, "2049-03-02T10:00:00.000Z");
        const at = utc("2049-03-02T10:00:00.000Z");

        yield* Effect.gen(function* checks() {
          yield* store.switchOn(
            {
              channelId: box.channelId,
              enabledAt: at,
              enabledBy: Option.none(),
              workspaceId,
            },
            box
          );

          assert.deepStrictEqual(
            (yield* store.switchedOn(workspaceId)).map(
              ({ channelId }) => channelId
            ),
            [box.channelId]
          );
          assert.deepStrictEqual(
            yield* store.box(box.channelId),
            Option.some(box)
          );

          yield* store.allowApplication({
            clientId: "synthetic-client",
            grantedAt: at,
            grantedBy: Option.none(),
            workspaceId,
          });

          assert.isTrue(yield* store.allows(workspaceId, "synthetic-client"));

          yield* store.revokeApplication(workspaceId, "synthetic-client");

          assert.isFalse(yield* store.allows(workspaceId, "synthetic-client"));

          const listed = yield* conversationOn(
            box,
            1,
            "2049-03-02T09:00:00.000Z"
          );

          const gone = yield* conversationOn(
            box,
            2,
            "2049-03-02T09:00:00.000Z"
          );

          yield* store.saveConversations([listed, gone]);

          const listedAt = utc("2049-03-02T10:00:00.000Z");

          // Missed by two whole listings in a row.
          yield* store.dropUnlisted(box.channelId, ["c1"], listedAt);

          assert.strictEqual(
            yield* store.dropUnlisted(box.channelId, ["c1"], listedAt),
            1
          );
          assert.deepStrictEqual(
            yield* store.conversation(gone.id),
            Option.none()
          );

          yield* store.channelGone(box.channelId);

          assert.deepStrictEqual(yield* store.switchedOn(workspaceId), []);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "erases a workspace's conversations, and forgets a user's name",
    () =>
      Effect.gen(function* erases() {
        const workspaceId = yield* freshWorkspace;
        const store = yield* MessageStore;
        const records = yield* EngagementRecords;
        const box = yield* boxOf(workspaceId, "2049-02-06T10:00:00.000Z");
        const at = utc("2049-02-06T10:00:00.000Z");

        const userId = UserIdSchema.make(
          "33333333-3333-4333-8333-333333333333"
        );

        yield* Effect.gen(function* checks() {
          yield* store.follow([box]);

          const talk = yield* conversationOn(
            box,
            1,
            "2049-02-06T09:00:00.000Z"
          );

          yield* store.saveConversations([talk]);

          const sent = writeMessage(
            yield* newId(OutgoingMessageIdSchema),
            talk,
            Option.some(userId),
            "Hello",
            at
          );

          yield* store.journalMessage(sent, Option.none());

          assert.deepStrictEqual(
            (yield* records.exportUserMessages(userId)).map(({ id }) => id),
            [sent.id]
          );

          yield* records.forgetUser(userId);

          assert.deepStrictEqual(
            (yield* store.outgoing(sent.id)).pipe(
              Option.flatMap(({ authorId }) => authorId)
            ),
            Option.none()
          );
          assert.deepStrictEqual(yield* records.exportUserMessages(userId), []);

          yield* records.eraseWorkspace(workspaceId);

          assert.deepStrictEqual(
            yield* store.conversation(talk.id),
            Option.none()
          );
          assert.deepStrictEqual(
            yield* store.box(box.channelId),
            Option.none()
          );
          // Erased, its channels are followed no more.
          assert.strictEqual(yield* store.follow([box]), 0);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect("deletes a channel's conversations at once when it leaves", () =>
    Effect.gen(function* leaves() {
      const workspaceId = yield* freshWorkspace;
      const store = yield* MessageStore;
      const records = yield* EngagementRecords;
      const box = yield* boxOf(workspaceId, "2049-02-07T10:00:00.000Z");

      yield* Effect.gen(function* checks() {
        yield* store.follow([box]);

        const talk = yield* conversationOn(box, 1, "2049-02-07T09:00:00.000Z");

        yield* store.saveConversations([talk]);
        yield* records.channelGone(
          box.channelId,
          "mastodon",
          utc("2049-02-07T10:00:00.000Z")
        );

        assert.deepStrictEqual(
          yield* store.conversation(talk.id),
          Option.none()
        );
        assert.deepStrictEqual(yield* store.box(box.channelId), Option.none());
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  // A message journalled on a conversation of the box: on its way, and
  // begun (the call may have gone out) when `attempted`.
  const pendingOn = Effect.fn("pendingOn")(function* pendingOn(
    box: MessageBox,
    n: number,
    at: string,
    attempted: boolean
  ) {
    const store = yield* MessageStore;
    const talk = yield* conversationOn(box, n, at);

    yield* store.saveConversations([talk]);

    const message = writeMessage(
      yield* newId(OutgoingMessageIdSchema),
      talk,
      Option.none(),
      "Thanks!",
      utc(at)
    );

    yield* store.journalMessage(message, Option.none());

    if (attempted) {
      yield* store.advanceMessage(
        Result.getOrThrow(beginMessage(message, utc(at))),
        message
      );
    }

    return message;
  });

  it.effect(
    "gives back the outbound message of what never set out when a channel leaves",
    () =>
      Effect.gen(function* givesBack() {
        const workspaceId = yield* freshWorkspace;
        const records = yield* EngagementRecords;
        const box = yield* boxOf(workspaceId, "2049-02-08T10:00:00.000Z");
        const at = "2049-02-08T09:00:00.000Z";

        yield* Effect.gen(function* checks() {
          yield* MessageStore.use((store) => store.follow([box]));

          const waiting = yield* pendingOn(box, 1, at, false);

          // Begun: it may be on the platform, and stays counted.
          yield* pendingOn(box, 2, at, true);

          yield* records.channelGone(box.channelId, "mastodon", utc(at));

          assert.deepStrictEqual(
            (yield* givenBackIn(workspaceId)).map((claim) => [
              claim.meter,
              claim.units,
              DateTime.formatIso(claim.at),
            ]),
            [["outboundMessages", 1, DateTime.formatIso(waiting.createdAt)]]
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );

  it.effect(
    "gives back the outbound message of what never set out when its workspace is erased",
    () =>
      Effect.gen(function* erased() {
        const workspaceId = yield* freshWorkspace;
        const records = yield* EngagementRecords;
        const box = yield* boxOf(workspaceId, "2049-02-09T10:00:00.000Z");

        yield* Effect.gen(function* checks() {
          yield* MessageStore.use((store) => store.follow([box]));
          yield* pendingOn(box, 1, "2049-02-09T09:00:00.000Z", false);
          yield* records.eraseWorkspace(workspaceId);

          assert.lengthOf(yield* givenBackIn(workspaceId), 1);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );
});
