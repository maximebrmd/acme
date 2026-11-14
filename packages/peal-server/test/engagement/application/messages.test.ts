// Direct messages in the inbox, on memory: what the collection keeps and
// tells, what a member sends and how it is journalled, metered, sent once
// and settled, and what the retention deletes.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Ref, Result } from "effect";
import { TestClock } from "effect/testing";

import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { CollectMessages } from "#engagement/application/collect-messages.ts";
import { EngagementMessages } from "#engagement/application/engagement-messages.ts";
import { MessageSettings } from "#engagement/application/message-settings.ts";
import { PurgeMessages } from "#engagement/application/purge-messages.ts";
import { SendMessage } from "#engagement/application/send-message.ts";
import { refreshConversation } from "#engagement/domain/conversation.ts";
import { followBox } from "#engagement/domain/message-box.ts";
import { beginMessage } from "#engagement/domain/outgoing-message.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import {
  blueskyChannel,
  makeMessageWorld,
  mastodonChannel,
} from "#test/engagement/fakes/message-world.ts";
import type { MessageWorld } from "#test/engagement/fakes/message-world.ts";
import {
  channelId,
  conversation,
  conversationId,
  conversationReading,
  directMessage,
  memberId,
  messageReading,
  messagedAt,
  participant,
  workspaceId,
} from "#test/engagement/support.ts";
import { FakeMetersLedger, fakeMeters } from "#test/shared/support.ts";

const actorWith = (...permissions: Permission[]) =>
  new Actor({
    permissions,
    subject: { _tag: "user", impersonatedBy: Option.none(), userId: memberId },
    workspaceId,
  });

const editor = actorWith(
  "engagement:read",
  "engagement:readMessages",
  "engagement:reply",
  "engagement:message"
);

// A viewer reads comments, never direct messages.
const viewer = actorWith("engagement:read");

// A member through an application (an MCP client, say), with every
// permission an editor holds.
const throughApp = new Actor({
  permissions: [...editor.permissions],
  subject: {
    _tag: "user",
    clientId: "synthetic-mcp-client",
    impersonatedBy: Option.none(),
    userId: memberId,
  },
  workspaceId,
});

const at = <A, E, R>(effect: Effect.Effect<A, E, R>, when = messagedAt) =>
  TestClock.setTime(DateTime.toEpochMillis(when)).pipe(Effect.andThen(effect));

// A world with conversation 1 on a channel of `platform`, its box
// followed before the conversation's messages were sent.
const worldWith = (
  platform: "bluesky" | "mastodon" = "mastodon",
  world: MessageWorld = makeMessageWorld()
) => {
  const started = conversation(1, { participants: [participant(1)] });
  const incoming = directMessage(1, {}, started);

  // Someone wrote: Peal answers, never starts.
  const talk = refreshConversation(
    started,
    conversationReading(1),
    [incoming],
    messagedAt
  );

  world.state.messages.set(incoming.id, incoming);

  world.state.channels.set(
    channelId(1),
    platform === "mastodon" ? mastodonChannel : blueskyChannel
  );
  world.state.conversations.set(talk.id, talk);

  return world;
};

const sending = (text: string, key?: string) =>
  EngagementMessages.use((messages) =>
    messages.send(editor, conversationId(1), text, Option.fromUndefinedOr(key))
  );

describe("the messages' collection", () => {
  it.effect("reads nothing where the server reads no messages", () => {
    const world = makeMessageWorld(new Set());

    world.state.boxes.set(
      channelId(1),
      followBox({ channelId: channelId(1), workspaceId }, messagedAt)
    );

    return at(
      Effect.gen(function* off() {
        yield* CollectMessages.use((collect) => collect.run(messagedAt));

        assert.lengthOf(world.state.reads, 0);
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "reads a channel only once a member in person turned its messages on, and forgets it when turned off",
    () => {
      const world = makeMessageWorld(new Set(["mastodon"]));

      world.state.channels.set(channelId(1), mastodonChannel);
      world.state.channels.set(channelId(2), {
        ...mastodonChannel,
        platform: "facebook",
      });

      const admin = actorWith("channel:connect", "engagement:readMessages");

      return at(
        Effect.gen(function* switches() {
          yield* CollectMessages.use((collect) => collect.run(messagedAt));

          assert.lengthOf(world.state.reads, 0);

          const refused = yield* MessageSettings.use((settings) =>
            settings.switchChannel(
              new Actor({
                permissions: ["channel:connect"],
                subject: throughApp.subject,
                workspaceId,
              }),
              channelId(1),
              true
            )
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "MessagesNeedPerson");

          const off = yield* MessageSettings.use((settings) =>
            settings.switchChannel(admin, channelId(2), true)
          ).pipe(Effect.flip);

          assert.strictEqual(off._tag, "MessageAbilityUnavailable");

          const on = yield* MessageSettings.use((settings) =>
            settings.switchChannel(admin, channelId(1), true)
          );

          assert.deepStrictEqual(
            on.channels.map(({ channelId: id }) => id),
            [channelId(1)]
          );

          yield* CollectMessages.use((collect) => collect.run(messagedAt));

          assert.deepStrictEqual(
            world.state.reads.map((read) => read.channelId),
            [channelId(1)]
          );

          world.state.conversations.set(conversationId(1), conversation(1));

          yield* MessageSettings.use((settings) =>
            settings.switchChannel(admin, channelId(1), false)
          );

          assert.strictEqual(world.state.conversations.size, 0);
          assert.isFalse(world.state.boxes.has(channelId(1)));
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "deletes a kept conversation a whole listing no longer shows, and keeps it when the listing was not whole",
    () => {
      const world = worldWith();

      world.state.boxes.set(
        channelId(1),
        followBox({ channelId: channelId(1), workspaceId }, messagedAt)
      );
      world.state.read = () =>
        Effect.succeed({
          conversations: [],
          halted: true,
          listed: [],
          listedWhole: false,
        });

      return Effect.gen(function* listings() {
        yield* at(CollectMessages.use((collect) => collect.run(messagedAt)));

        assert.strictEqual(world.state.conversations.size, 1);

        world.state.read = () =>
          Effect.succeed({
            conversations: [],
            halted: false,
            listed: ["c9"],
            listedWhole: true,
          });

        const later = DateTime.addDuration(messagedAt, "2 hours");

        yield* at(
          CollectMessages.use((collect) => collect.run(later)),
          later
        );

        assert.strictEqual(world.state.conversations.size, 0);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "keeps what a first read finds, and tells only what came after the channel was followed",
    () => {
      const world = makeMessageWorld();
      const followedAt = DateTime.subtractDuration(messagedAt, "1 hour");

      world.state.boxes.set(
        channelId(1),
        followBox({ channelId: channelId(1), workspaceId }, followedAt)
      );

      world.state.read = () =>
        Effect.succeed({
          conversations: [
            conversationReading(1, {
              messages: [
                messageReading(1, {
                  sentAt: DateTime.subtractDuration(messagedAt, "2 days"),
                }),
                messageReading(2),
                messageReading(3, {
                  fromAccount: true,
                  senderPlatformId: Option.none(),
                }),
              ],
            }),
          ],
          halted: false,
          listed: [],
          listedWhole: false,
        });

      return at(
        Effect.gen(function* reads() {
          const report = yield* CollectMessages.use((collect) =>
            collect.run(messagedAt)
          );

          assert.strictEqual(report.read, 1);
          assert.strictEqual(world.state.conversations.size, 1);
          assert.strictEqual(world.state.messages.size, 3);
          assert.deepStrictEqual(
            world.state.received.flatMap(({ messages }) =>
              messages.map(({ platformMessageId }) => platformMessageId)
            ),
            ["m2"]
          );

          const [kept] = world.state.conversations.values();

          assert.isTrue(Option.isSome(kept?.lastIncomingAt ?? Option.none()));
          assert.isTrue(
            DateTime.isGreaterThan(
              world.state.boxes.get(channelId(1))?.nextReadAt ?? messagedAt,
              messagedAt
            )
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("deletes at once a message the platform says was deleted", () => {
    const world = worldWith();
    const kept = directMessage(1);

    world.state.messages.set(kept.id, kept);
    world.state.boxes.set(
      channelId(1),
      followBox({ channelId: channelId(1), workspaceId }, messagedAt)
    );
    world.state.read = () =>
      Effect.succeed({
        conversations: [
          conversationReading(1, {
            complete: false,
            deleted: ["m1"],
            messages: [],
            revision: "r9",
          }),
        ],
        halted: false,
        listed: [],
        listedWhole: false,
      });

    return at(
      Effect.gen(function* deletes() {
        yield* CollectMessages.use((collect) => collect.run(messagedAt));

        assert.strictEqual(world.state.messages.size, 0);
        assert.strictEqual(
          world.state.conversations.get(conversationId(1))?.revision,
          "r9"
        );
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect("keeps no conversation whose last message is past its time", () => {
    const world = makeMessageWorld();

    world.state.boxes.set(
      channelId(1),
      followBox({ channelId: channelId(1), workspaceId }, messagedAt)
    );
    world.state.read = () =>
      Effect.succeed({
        conversations: [
          conversationReading(1, {
            lastMessageAt: DateTime.subtractDuration(messagedAt, "31 days"),
          }),
        ],
        halted: false,
        listed: [],
        listedWhole: false,
      });

    return at(
      Effect.gen(function* old() {
        yield* CollectMessages.use((collect) => collect.run(messagedAt));

        assert.strictEqual(world.state.conversations.size, 0);
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "deletes a channel that left, and puts off one its platform did not answer",
    () => {
      const world = worldWith();

      world.state.boxes.set(
        channelId(1),
        followBox({ channelId: channelId(1), workspaceId }, messagedAt)
      );
      world.state.boxes.set(
        channelId(2),
        followBox({ channelId: channelId(2), workspaceId }, messagedAt)
      );
      world.state.read = (request) =>
        Effect.fail(
          request.channelId === channelId(1)
            ? new ChannelUnreadable({ reason: "disconnected" })
            : new PlatformUnavailable()
        );

      return at(
        Effect.gen(function* fails() {
          const report = yield* CollectMessages.use((collect) =>
            collect.run(messagedAt)
          );

          assert.strictEqual(report.deferred, 2);
          assert.strictEqual(world.state.conversations.size, 0);
          assert.isFalse(world.state.boxes.has(channelId(1)));
          assert.deepStrictEqual(
            world.state.boxes.get(channelId(2))?.nextReadAt,
            DateTime.addDuration(messagedAt, "30 minutes")
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("a message a member sends", () => {
  it.effect(
    "is journalled with its job, mentions the participants on Mastodon, and marks the conversation read",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* journals() {
          const message = yield* sending("Thanks for writing!");

          assert.strictEqual(
            message.text,
            "@reader1@social.example Thanks for writing!"
          );
          assert.deepStrictEqual(message.authorId, Option.some(memberId));
          assert.deepStrictEqual(world.state.jobs, [message.id]);
          assert.deepStrictEqual(
            world.state.conversations.get(conversationId(1))?.readAt,
            Option.some(messagedAt)
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("goes as written on Bluesky, within its chat's limit", () => {
    const world = worldWith("bluesky");

    return at(
      Effect.gen(function* bluesky() {
        assert.strictEqual((yield* sending(" Hello ")).text, "Hello");

        const refusal = yield* EngagementMessages.use((messages) =>
          messages.send(editor, conversationId(1), "a".repeat(1001))
        ).pipe(Effect.flip);

        assert.deepInclude(refusal, {
          _tag: "ReplyTooLong",
          maximum: 1000,
          unit: "graphemes",
        });
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect("is refused an empty text, or one longer than a status", () => {
    const world = worldWith();

    return at(
      Effect.gen(function* refused() {
        assert.strictEqual(
          (yield* sending(" \u0000 ").pipe(Effect.flip))._tag,
          "ReplyEmpty"
        );
        assert.deepInclude(yield* sending("a".repeat(490)).pipe(Effect.flip), {
          _tag: "ReplyTooLong",
          maximum: 500,
        });
        assert.lengthOf(world.state.jobs, 0);
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "waits for the one on its way, and answers a key sent again",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* once() {
          const first = yield* sending("Hello", "synthetic-key-1");
          const again = yield* sending("Hello", "synthetic-key-1");

          assert.strictEqual(again.id, first.id);
          assert.deepInclude(yield* sending("Another").pipe(Effect.flip), {
            _tag: "MessagePending",
            messageId: first.id,
          });
          assert.strictEqual(
            (yield* sending("Another", "synthetic-key-1").pipe(Effect.flip))
              ._tag,
            "ReplyKeyReused"
          );
          assert.lengthOf(world.state.jobs, 1);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "needs engagement:message, the channel able and its platform read",
    () => {
      const off = worldWith("mastodon", makeMessageWorld(new Set()));
      const bare = worldWith();

      bare.state.channels.set(channelId(1), {
        ...mastodonChannel,
        scopes: ["profile"],
      });

      return Effect.gen(function* refused() {
        const missing = yield* EngagementMessages.use((messages) =>
          messages.send(viewer, conversationId(1), "Hello")
        ).pipe(Effect.flip, Effect.provide(bare.layer));

        assert.deepInclude(missing, {
          _tag: "MissingPermission",
          permission: "engagement:message",
        });
        assert.deepInclude(
          yield* sending("Hello").pipe(Effect.flip, Effect.provide(bare.layer)),
          { _tag: "MessageAbilityUnavailable", standing: "reconnect" }
        );
        assert.deepInclude(
          yield* sending("Hello").pipe(Effect.flip, Effect.provide(off.layer)),
          { _tag: "MessageAbilityUnavailable", standing: "unsupported" }
        );
      }).pipe((effect) => at(effect));
    }
  );

  it.effect("is refused for a conversation of another workspace", () => {
    const world = worldWith();

    const stranger = new Actor({
      permissions: [
        "engagement:read",
        "engagement:readMessages",
        "engagement:message",
      ],
      subject: { _tag: "apiKey", apiKeyId: "synthetic-key" },
      workspaceId: WorkspaceIdSchema.make(
        "99999999-9999-4999-8999-999999999999"
      ),
    });

    return at(
      Effect.gen(function* elsewhere() {
        const refusal = yield* EngagementMessages.use((messages) =>
          messages.send(stranger, conversationId(1), "Hello")
        ).pipe(Effect.flip);

        assert.strictEqual(refusal._tag, "ConversationNotFound");

        const reading = yield* EngagementMessages.use((messages) =>
          messages.conversation(stranger, conversationId(1))
        ).pipe(Effect.flip);

        assert.strictEqual(reading._tag, "ConversationNotFound");
      })
    ).pipe(Effect.provide(world.layer));
  });
});

// A Mastodon conversation on a server that bills, its billing account
// allowed `allowed` messages this month.
const billed = (allowed: number) => {
  const meters = fakeMeters({ allowed: Option.some(allowed) });

  return {
    meters,
    world: worldWith("mastodon", makeMessageWorld(undefined, meters)),
  };
};

describe("a message on a server that bills", () => {
  const ledger = FakeMetersLedger.use(Ref.get);

  it.effect("claims an outbound message, and refuses past the month's", () => {
    const { meters, world } = billed(1);

    world.state.conversations.set(
      conversationId(2),
      refreshConversation(
        conversation(2, { platformConversationId: "c2" }),
        conversationReading(2),
        [directMessage(2, {}, conversation(2))],
        messagedAt
      )
    );

    return at(
      Effect.gen(function* claims() {
        yield* sending("Hello");

        const refusal = yield* EngagementMessages.use((messages) =>
          messages.send(editor, conversationId(2), "Hello")
        ).pipe(Effect.flip);

        assert.deepInclude(refusal, {
          _tag: "AllowanceReached",
          meter: "outboundMessages",
        });
        assert.strictEqual(world.state.outgoing.size, 1);
        assert.strictEqual((yield* ledger).used.get("outboundMessages"), 1);
      })
    ).pipe(Effect.provide(Layer.merge(world.layer, meters)));
  });

  it.effect(
    "gives it back when the channel's messages are turned off before it set out",
    () => {
      const { meters, world } = billed(5);
      const admin = actorWith("channel:connect");

      return at(
        Effect.gen(function* off() {
          yield* sending("Hello");

          yield* MessageSettings.use((settings) =>
            settings.switchChannel(admin, channelId(1), false)
          );

          assert.strictEqual(world.state.outgoing.size, 0);
          assert.strictEqual((yield* ledger).used.get("outboundMessages"), 0);
        })
      ).pipe(Effect.provide(Layer.merge(world.layer, meters)));
    }
  );

  it.effect("gives it back when the message never went out", () => {
    const { meters, world } = billed(5);

    world.state.sending = { _tag: "failed", reason: "refused" };

    return at(
      Effect.gen(function* givesBack() {
        const message = yield* sending("Hello");

        assert.strictEqual(
          yield* SendMessage.use((send) => send.run(message.id)),
          "settled"
        );
        assert.strictEqual(
          world.state.outgoing.get(message.id)?.status._tag,
          "failed"
        );
        assert.strictEqual((yield* ledger).used.get("outboundMessages"), 0);
      })
    ).pipe(Effect.provide(Layer.merge(world.layer, meters)));
  });
});

describe("sending a message", () => {
  it.effect("calls the platform once, and settles it as it answered", () => {
    const world = worldWith();

    return at(
      Effect.gen(function* sends() {
        const message = yield* sending("Hello");

        yield* SendMessage.use((send) => send.run(message.id));

        assert.lengthOf(world.state.sent, 1);
        assert.deepInclude(world.state.outgoing.get(message.id)?.status, {
          _tag: "sent",
          platformMessageId: Option.some("m-sent"),
        });
        assert.deepStrictEqual(
          world.state.settled.map(({ id }) => id),
          [message.id]
        );
        // A run after it ended sends nothing.
        assert.strictEqual(
          yield* SendMessage.use((send) => send.run(message.id)),
          "superseded"
        );
        assert.lengthOf(world.state.sent, 1);
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "looks up, never sends again, a message whose answer was lost",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* lost() {
          const message = yield* sending("Hello");

          // A run set out, then the server stopped before the answer.
          world.state.outgoing.set(
            message.id,
            Result.getOrThrow(beginMessage(message, messagedAt))
          );

          yield* SendMessage.use((send) => send.run(message.id));

          assert.lengthOf(world.state.sent, 0);
          assert.lengthOf(world.state.resumed, 1);
          assert.strictEqual(
            world.state.outgoing.get(message.id)?.status._tag,
            "unconfirmed"
          );

          // A member checks the platform: it never went out.
          const confirmed = yield* EngagementMessages.use((messages) =>
            messages.confirm(editor, message.id, false)
          );

          assert.deepInclude(confirmed.status, { reason: "notSent" });
          assert.deepStrictEqual(world.state.cancelled, [message.id]);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "hands to a person a message no job settled within the hour",
    () => {
      const world = worldWith();

      return Effect.gen(function* stranded() {
        const message = yield* at(sending("Hello"));

        const handed = yield* at(
          SendMessage.use((send) => send.settleStranded),
          DateTime.addDuration(messagedAt, "2 hours")
        );

        assert.strictEqual(handed, 1);
        assert.strictEqual(
          world.state.outgoing.get(message.id)?.status._tag,
          "unconfirmed"
        );
        assert.deepStrictEqual(world.state.cancelled, [message.id]);
      }).pipe(Effect.provide(world.layer));
    }
  );
});

describe("a workspace's conversations", () => {
  it.effect("are read with engagement:readMessages, a page at a time", () => {
    const world = worldWith();
    const kept = directMessage(1);

    world.state.messages.set(kept.id, kept);

    return at(
      Effect.gen(function* reads() {
        const page = yield* EngagementMessages.use((messages) =>
          messages.list(
            editor,
            { channelId: Option.none(), unread: false },
            { after: Option.none(), limit: 10 }
          )
        );

        assert.deepStrictEqual(
          page.items.map(({ conversation: talk }) => talk.id),
          [conversationId(1)]
        );

        const detail = yield* EngagementMessages.use((messages) =>
          messages.conversation(editor, conversationId(1))
        );

        assert.deepStrictEqual(
          detail.messages.map(({ id }) => id),
          [kept.id]
        );
        assert.deepStrictEqual(detail.abilities, {
          read: "available",
          send: "available",
        });
        assert.isTrue(detail.window.open);

        const refusal = yield* EngagementMessages.use((messages) =>
          messages.markRead(viewer, conversationId(1), true)
        ).pipe(Effect.flip);

        assert.strictEqual(refusal._tag, "MissingPermission");
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "lose each message 30 days after it was sent, and go once none is left",
    () => {
      const world = worldWith();

      const recent = directMessage(2, {
        sentAt: DateTime.addDuration(messagedAt, "20 days"),
      });

      world.state.messages.set(recent.id, recent);

      return Effect.gen(function* purges() {
        const first = yield* at(
          PurgeMessages.use((purging) => purging.purge),
          DateTime.addDuration(messagedAt, "31 days")
        );

        assert.deepStrictEqual(first, { conversations: 1, messages: 1 });
        assert.deepStrictEqual([...world.state.messages.keys()], []);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("are paged, the latest messages first, shown oldest first", () => {
    const world = worldWith();

    for (const n of [2, 3]) {
      const message = directMessage(n, {
        sentAt: DateTime.addDuration(messagedAt, Duration.minutes(n)),
      });

      world.state.messages.set(message.id, message);
    }

    return at(
      Effect.gen(function* pages() {
        const latest = yield* EngagementMessages.use((messages) =>
          messages.conversation(editor, conversationId(1), {
            before: Option.none(),
            limit: 2,
          })
        );

        assert.deepStrictEqual(
          latest.messages.map(({ platformMessageId }) => platformMessageId),
          ["m2", "m3"]
        );

        const older = yield* EngagementMessages.use((messages) =>
          messages.conversation(editor, conversationId(1), {
            before: latest.older,
            limit: 2,
          })
        );

        assert.deepStrictEqual(
          older.messages.map(({ platformMessageId }) => platformMessageId),
          ["m1"]
        );
        assert.isTrue(Option.isNone(older.older));
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "are refused to a viewer, and to an application the owner did not let read them",
    () => {
      const world = worldWith();
      const owner = actorWith("organization:secure");

      return at(
        Effect.gen(function* consent() {
          const byViewer = yield* EngagementMessages.use((messages) =>
            messages.list(
              viewer,
              { channelId: Option.none(), unread: false },
              { after: Option.none(), limit: 10 }
            )
          ).pipe(Effect.flip);

          assert.strictEqual(byViewer._tag, "MissingPermission");

          // The application lists who and how many, never what they say.
          const listed = yield* EngagementMessages.use((messages) =>
            messages.list(
              throughApp,
              { channelId: Option.none(), unread: false },
              { after: Option.none(), limit: 10 }
            )
          );

          assert.lengthOf(listed.items, 1);

          const read = yield* EngagementMessages.use((messages) =>
            messages.conversation(throughApp, conversationId(1))
          ).pipe(Effect.flip);

          const sent = yield* EngagementMessages.use((messages) =>
            messages.send(throughApp, conversationId(1), "Hello")
          ).pipe(Effect.flip);

          assert.deepStrictEqual(
            [read._tag, sent._tag],
            ["MessagesNeedConsent", "MessagesNeedConsent"]
          );

          yield* MessageSettings.use((settings) =>
            settings.allowApplication(owner, "synthetic-mcp-client", true)
          );

          const allowed = yield* EngagementMessages.use((messages) =>
            messages.conversation(throughApp, conversationId(1))
          );

          assert.lengthOf(allowed.messages, 1);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("take no first message from Peal", () => {
    const world = worldWith();

    world.state.conversations.set(conversationId(1), conversation(1));

    return at(
      Effect.gen(function* first() {
        const refused = yield* sending("Hello").pipe(Effect.flip);

        assert.deepInclude(refused, {
          _tag: "MessageAbilityUnavailable",
          standing: "unsupported",
        });
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "refuse a Mastodon message that mentions someone outside the conversation",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* outside() {
          const refused = yield* sending("Thanks! cc @boss@other.example").pipe(
            Effect.flip
          );

          assert.deepInclude(refused, {
            _tag: "MessageMentionsOutside",
            mentions: ["@boss@other.example"],
          });
          assert.lengthOf(world.state.jobs, 0);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});
