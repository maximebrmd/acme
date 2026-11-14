import { assert, describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Result, Schema } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { TestClock } from "effect/testing";
import {
  Api,
  Forbidden,
  InboxActionUnavailable,
  InboxConversationNotFound,
  MessagePending,
  NewInboxMessageSchema,
  ReplyInvalid,
} from "peal-contract";
import type { Member } from "peal-contract";

import { InboxMessagesApiLive } from "#engagement/container.ts";
import { refreshConversation } from "#engagement/domain/conversation.ts";
import type { Permission } from "#shared/domain/access.ts";
import { memberOf } from "#test/channels/support.ts";
import {
  makeMessageWorld,
  mastodonChannel,
} from "#test/engagement/fakes/message-world.ts";
import type { MessageWorld } from "#test/engagement/fakes/message-world.ts";
import {
  channelId,
  conversation,
  conversationReading,
  directMessage,
  messagedAt,
  workspaceId,
} from "#test/engagement/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The direct messages endpoints on their real use cases, over the
// in-memory world. Each request acts as a member, as WorkspaceAccess
// would.

const clientAs = (
  world: MessageWorld,
  permissions: readonly Permission[],
  member: Member = memberOf(workspaceId, permissions)
) =>
  HttpApiTest.groups(Api, ["inboxMessages"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        InboxMessagesApiLive.pipe(
          Layer.provideMerge(securityTest(member)),
          Layer.provide(world.layer)
        ),
        HttpServer.layerServices
      )
    )
  );

const params = { workspaceId };

// A world with one Mastodon conversation, and its one message.
const worldWithConversation = () => {
  const world = makeMessageWorld();
  const started = conversation(1);
  const kept = directMessage(1, {}, started);

  const talk = refreshConversation(
    started,
    conversationReading(1),
    [kept],
    messagedAt
  );

  world.state.channels.set(channelId(1), mastodonChannel);
  world.state.conversations.set(talk.id, talk);
  world.state.messages.set(kept.id, kept);

  return { talk, world };
};

const at = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  TestClock.setTime(DateTime.toEpochMillis(messagedAt)).pipe(
    Effect.andThen(effect)
  );

describe("the direct messages endpoints", () => {
  it.effect("list the conversations, and show one whole to an editor", () => {
    const { talk, world } = worldWithConversation();

    return at(
      Effect.gen(function* reads() {
        const viewer = yield* clientAs(world, permissionsFor("viewer"));

        // A viewer reads comments, never direct messages.
        assert.instanceOf(
          yield* viewer.inboxMessages
            .listConversations({ params, query: {} })
            .pipe(Effect.flip),
          Forbidden
        );

        const client = yield* clientAs(world, permissionsFor("editor"));

        const page = yield* client.inboxMessages.listConversations({
          params,
          query: {},
        });

        assert.deepStrictEqual(
          page.items.map(({ id, messages, participants }) => ({
            id,
            messages,
            participants: participants.map(({ handle }) => handle),
          })),
          [
            {
              id: talk.id,
              messages: 1,
              participants: ["reader1@social.example"],
            },
          ]
        );
        assert.strictEqual(page.nextCursor, null);

        const detail = yield* client.inboxMessages.getConversation({
          params: { ...params, conversationId: talk.id },
          query: {},
        });

        assert.strictEqual(detail.platform, "mastodon");
        assert.deepStrictEqual(detail.abilities, {
          read: "available",
          send: "available",
        });
        assert.deepStrictEqual(
          detail.messages.map(({ text }) => text),
          ["Message 1"]
        );
        assert.deepStrictEqual(detail.window, { closesAt: null, open: true });
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect("page conversations by the cursor they give", () => {
    const { world } = worldWithConversation();

    const older = conversation(2, {
      lastMessageAt: DateTime.subtractDuration(messagedAt, "1 day"),
      platformConversationId: "c2",
    });

    world.state.conversations.set(older.id, older);

    return at(
      Effect.gen(function* pages() {
        const client = yield* clientAs(world, permissionsFor("editor"));

        const first = yield* client.inboxMessages.listConversations({
          params,
          query: { limit: 1 },
        });

        assert.isNotNull(first.nextCursor);

        const second = yield* client.inboxMessages.listConversations({
          params,
          query: { cursor: first.nextCursor ?? "", limit: 1 },
        });

        assert.deepStrictEqual(
          second.items.map(({ id }) => id),
          [older.id]
        );

        const refused = yield* client.inboxMessages
          .listConversations({ params, query: { cursor: "not-a-cursor" } })
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "BadRequest");
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "mark a conversation for a key that may answer, and count every message it holds",
    () => {
      const { talk, world } = worldWithConversation();
      const second = directMessage(2, {}, talk);

      world.state.messages.set(second.id, second);

      return at(
        Effect.gen(function* marks() {
          const client = yield* clientAs(world, ["engagement:message"]);

          const marked = yield* client.inboxMessages.setConversationRead({
            params: { ...params, conversationId: talk.id },
            payload: { read: true },
          });

          assert.isFalse(marked.unread);
          assert.strictEqual(marked.messages, 2);

          const editor = yield* clientAs(world, permissionsFor("editor"));

          const detail = yield* editor.inboxMessages.getConversation({
            params: { ...params, conversationId: talk.id },
            query: { limit: 1 },
          });

          assert.lengthOf(detail.messages, 1);
          assert.strictEqual(detail.conversation.messages, 2);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "send a message, journalled, and refuse a second on its way",
    () => {
      const { talk, world } = worldWithConversation();

      return at(
        Effect.gen(function* sends() {
          const client = yield* clientAs(world, permissionsFor("editor"));

          const sent = yield* client.inboxMessages.sendMessage({
            headers: {},
            params: { ...params, conversationId: talk.id },
            payload: { text: "Thanks!" },
          });

          assert.strictEqual(sent.status, "sending");
          assert.strictEqual(sent.text, "@reader1@social.example Thanks!");

          const second = yield* client.inboxMessages
            .sendMessage({
              headers: {},
              params: { ...params, conversationId: talk.id },
              payload: { text: "Again" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(second, MessagePending);

          const read = yield* client.inboxMessages.setConversationRead({
            params: { ...params, conversationId: talk.id },
            payload: { read: false },
          });

          assert.isTrue(read.unread);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "refuse a viewer's message, an empty one, and a channel unable to send",
    () => {
      const { talk, world } = worldWithConversation();

      return at(
        Effect.gen(function* refuses() {
          const viewer = yield* clientAs(world, permissionsFor("viewer"));
          const editor = yield* clientAs(world, permissionsFor("editor"));
          const target = { ...params, conversationId: talk.id };

          assert.instanceOf(
            yield* viewer.inboxMessages
              .sendMessage({
                headers: {},
                params: target,
                payload: { text: "Hi" },
              })
              .pipe(Effect.flip),
            Forbidden
          );

          const blank = yield* editor.inboxMessages
            .sendMessage({
              headers: {},
              params: target,
              payload: { text: " " },
            })
            .pipe(Effect.flip);

          assert.instanceOf(blank, ReplyInvalid);

          world.state.channels.set(channelId(1), {
            ...mastodonChannel,
            scopes: ["profile"],
          });

          assert.instanceOf(
            yield* editor.inboxMessages
              .sendMessage({
                headers: {},
                params: target,
                payload: { text: "Hi" },
              })
              .pipe(Effect.flip),
            InboxActionUnavailable
          );
          assert.instanceOf(
            yield* editor.inboxMessages
              .getConversation({
                params: { ...params, conversationId: "not-an-id" },
                query: {},
              })
              .pipe(Effect.flip),
            InboxConversationNotFound
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it("take no text holding a NUL", () => {
    const decoded = Schema.decodeUnknownResult(NewInboxMessageSchema)({
      text: "Hi\u0000",
    });

    expect(Result.isFailure(decoded)).toBeTruthy();
  });

  it.effect(
    "turn a channel's messages on for an admin, and let an owner allow an application",
    () => {
      const { world } = worldWithConversation();

      return at(
        Effect.gen(function* settings() {
          const editor = yield* clientAs(world, permissionsFor("editor"));
          const admin = yield* clientAs(world, permissionsFor("admin"));
          const owner = yield* clientAs(world, permissionsFor("owner"));

          assert.instanceOf(
            yield* editor.inboxMessages
              .setChannelMessages({
                params: { ...params, channelId: channelId(1) },
                payload: { enabled: true },
              })
              .pipe(Effect.flip),
            Forbidden
          );

          const on = yield* admin.inboxMessages.setChannelMessages({
            params: { ...params, channelId: channelId(1) },
            payload: { enabled: true },
          });

          assert.deepStrictEqual(
            on.channels.map(({ channelId: id }) => id),
            [channelId(1)]
          );
          assert.instanceOf(
            yield* admin.inboxMessages
              .setMessageApplication({
                params,
                payload: { allowed: true, clientId: "synthetic-client" },
              })
              .pipe(Effect.flip),
            Forbidden
          );

          const allowed = yield* owner.inboxMessages.setMessageApplication({
            params,
            payload: { allowed: true, clientId: "synthetic-client" },
          });

          assert.deepStrictEqual(
            allowed.applications.map(({ clientId }) => clientId),
            ["synthetic-client"]
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});
