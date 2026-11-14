import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { blueskyMessages } from "#engagement/infrastructure/platforms/bluesky/bluesky-messages.ts";
import type { OutgoingDirect } from "#engagement/infrastructure/platforms/message-platform.ts";
import { blueskyChatScopes } from "#shared/domain/bluesky-scopes.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { outgoingMessageId, participant } from "#test/engagement/support.ts";
import {
  dropped,
  headerOf,
  json,
  jsonBodyOf,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";
import { blueskySession } from "#test/publishing/platforms/support.ts";

// Bluesky's direct messages against one loopback server standing for the
// account's PDS, which proxies the chat service, answering as the
// chat.bsky.convo lexicons say. It checks no DPoP proof: the sender has
// its own tests.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000e3");

const did = "did:plc:synthetic0studio0account";
const reader = "did:plc:synthetic0reader00000000";

const now = DateTime.makeUnsafe("2026-11-12T10:00:00.000Z");

const keptSince = DateTime.subtractDuration(now, "30 days");

const message = (
  id: string,
  sender: string,
  changed: { readonly [field: string]: JsonValue } = {}
): JsonValue => ({
  $type: "chat.bsky.convo.defs#messageView",
  id,
  rev: `rev-${id}`,
  sender: { did: sender },
  sentAt: "2026-11-12T09:00:00.000Z",
  text: `Message ${id}`,
  ...changed,
});

const convo = (
  id: string,
  changed: { readonly [field: string]: JsonValue } = {}
): JsonValue => ({
  id,
  lastMessage: message(`${id}-last`, reader),
  members: [
    { did, handle: "studio.example" },
    { did: reader, displayName: "Reader", handle: "reader.example" },
  ],
  muted: false,
  rev: `rev-${id}`,
  status: "accepted",
  unreadCount: 1,
  ...changed,
});

// A conversation whose last message is older than what Peal keeps.
const old = (id: string) =>
  convo(id, {
    lastMessage: message(`${id}-last`, reader, {
      sentAt: "2026-09-01T09:00:00.000Z",
    }),
  });

const sentBody = jsonBodyOf(
  Schema.Struct({
    convoId: Schema.String,
    message: Schema.Struct({ text: Schema.String }),
  })
);

const onNetwork = Effect.fnUntraced(function* onNetwork(
  handle: (request: PlatformRequest) => PlatformAnswer
) {
  const server = yield* platformServer(handle);

  const account: ChannelAccount = {
    accountId: did,
    channelId,
    connection: Option.none(),
    platform: "bluesky",
    scopes: ["atproto", ...blueskyChatScopes],
  };

  const session = yield* blueskySession({
    accessToken: "access-1",
    did,
    expiresAt: DateTime.addDuration(now, "1 hour"),
    pds: server.url,
  });

  const platform = yield* Effect.gen(function* building() {
    return yield* blueskyMessages({ http: yield* publicHttpClient });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        channelAccessOf(account, [session]),
        FetchHttpClient.layer,
        OpenOutboundGuard,
        Digest.layerWebCrypto,
        SecureRandom.layerWebCrypto
      )
    )
  );

  return { account, platform, server };
});

const outgoing: OutgoingDirect = {
  createdAt: DateTime.makeUnsafe("2026-11-12T09:30:00.000Z"),
  latestPlatformId: Option.some("c1-last"),
  messageId: outgoingMessageId(1),
  participants: [participant(1)],
  platformConversationId: "c1",
  request: false,
  takenIds: [],
  text: "Thanks for writing!",
};

const at = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  TestClock.setTime(DateTime.toEpochMillis(now)).pipe(Effect.andThen(effect));

describe("Bluesky's direct messages", () => {
  it.effect(
    "reads the direct conversations that changed, through the chat service's proxy",
    () =>
      at(
        Effect.gen(function* reads() {
          const { account, platform, server } = yield* onNetwork((request) => {
            if (request.path === "/xrpc/chat.bsky.convo.listConvos") {
              return json({
                convos: [
                  convo("c1"),
                  convo("c2"),
                  convo("g1", {
                    kind: { $type: "chat.bsky.convo.defs#groupConvo" },
                  }),
                  convo("c3", {
                    lastMessage: message("c3-last", reader, {
                      sentAt: "2026-09-01T09:00:00.000Z",
                    }),
                  }),
                  convo("c4", { status: "request" }),
                ],
              });
            }

            return request.query.get("convoId") === "c1"
              ? json({
                  messages: [
                    message("m3", did, { text: "On our way" }),
                    {
                      $type: "chat.bsky.convo.defs#deletedMessageView",
                      id: "m2",
                      rev: "rev-m2",
                      sender: { did: reader },
                      sentAt: "2026-11-12T08:59:00.000Z",
                    },
                    message("m1", reader, {
                      embed: { $type: "app.bsky.embed.record#view" },
                    }),
                    {
                      $type: "chat.bsky.convo.defs#systemMessageView",
                      id: "s1",
                      rev: "rev-s1",
                      sentAt: "2026-11-12T08:00:00.000Z",
                    },
                  ],
                })
              : json({ messages: [] });
          });

          const batch = yield* platform.read(account, {
            keptSince,
            known: new Map([["c2", "rev-c2"]]),
          });

          const [list] = server.requests();

          assert.strictEqual(
            list === undefined ? "" : headerOf(list, "atproto-proxy"),
            "did:web:api.bsky.chat#bsky_chat"
          );
          assert.isFalse(batch.halted);
          assert.deepStrictEqual(
            batch.conversations.map(({ platformConversationId, request }) => ({
              platformConversationId,
              request,
            })),
            [
              { platformConversationId: "c1", request: false },
              { platformConversationId: "c4", request: true },
            ]
          );

          const [first] = batch.conversations;

          assert.deepStrictEqual(first?.deleted, ["m2"]);
          assert.isTrue(first?.complete);
          assert.deepStrictEqual(
            first?.participants.map(({ handle }) => handle),
            ["reader.example"]
          );
          assert.deepStrictEqual(
            first?.messages.map((read) => ({
              attachments: read.attachments,
              fromAccount: read.fromAccount,
              id: read.platformMessageId,
            })),
            [
              { attachments: 0, fromAccount: true, id: "m3" },
              { attachments: 1, fromAccount: false, id: "m1" },
            ]
          );
        })
      )
  );

  it.effect(
    "stops listing at a page wholly older than what Peal keeps, the listing whole",
    () =>
      at(
        Effect.gen(function* stops() {
          const { account, platform, server } = yield* onNetwork((request) => {
            if (request.path !== "/xrpc/chat.bsky.convo.listConvos") {
              return json({ messages: [] });
            }

            return request.query.get("cursor") === "p2"
              ? json({ convos: [old("c8"), old("c9")], cursor: "p3" })
              : json({ convos: [convo("c1")], cursor: "p2" });
          });

          const batch = yield* platform.read(account, {
            keptSince,
            known: new Map([["c1", "rev-c1"]]),
          });

          assert.isFalse(batch.halted);
          assert.isTrue(batch.listedWhole);
          assert.lengthOf(
            server
              .requests()
              .filter(
                ({ path }) => path === "/xrpc/chat.bsky.convo.listConvos"
              ),
            2
          );
        })
      )
  );

  it.effect("pauses the channel when the chat service refuses its scope", () =>
    at(
      Effect.gen(function* refused() {
        const { account, platform } = yield* onNetwork(() =>
          json({ error: "ScopeMissingError", message: "Missing scope" }, 403)
        );

        const failure = yield* platform
          .read(account, { keptSince, known: new Map() })
          .pipe(Effect.flip);

        assert.deepInclude(failure, {
          _tag: "ChannelUnreadable",
          reason: "paused",
        });
      })
    )
  );

  it.effect("accepts a request before answering it, and sends the text", () =>
    at(
      Effect.gen(function* sends() {
        const { account, platform, server } = yield* onNetwork((request) =>
          request.path === "/xrpc/chat.bsky.convo.acceptConvo"
            ? json({ rev: "rev-2" })
            : json(message("m9", did, { text: "Thanks for writing!" }))
        );

        const outcome = yield* platform.send(account, {
          ...outgoing,
          request: true,
        });

        assert.deepStrictEqual(outcome, {
          _tag: "sent",
          platformMessageId: "m9",
        });
        assert.deepStrictEqual(
          server.requests().map(({ path }) => path),
          [
            "/xrpc/chat.bsky.convo.acceptConvo",
            "/xrpc/chat.bsky.convo.sendMessage",
          ]
        );

        const [, sent] = server.requests();

        assert.deepStrictEqual(
          sent === undefined ? undefined : sentBody(sent),
          { convoId: "c1", message: { text: "Thanks for writing!" } }
        );
      })
    )
  );

  it.effect("fails a message to a conversation that is gone", () =>
    at(
      Effect.gen(function* gone() {
        const { account, platform } = yield* onNetwork(() =>
          json({ error: "InvalidConvo", message: "Convo not found" }, 400)
        );

        assert.deepStrictEqual(yield* platform.send(account, outgoing), {
          _tag: "failed",
          reason: "conversationGone",
        });
      })
    )
  );

  it.effect("leaves a message whose answer was lost unconfirmed", () =>
    at(
      Effect.gen(function* lost() {
        const { account, platform } = yield* onNetwork(() => dropped);

        assert.deepStrictEqual(yield* platform.send(account, outgoing), {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
      })
    )
  );

  it.effect(
    "resumes by looking, never sending: sent when exactly one is the message",
    () =>
      at(
        Effect.gen(function* resumes() {
          const found = yield* onNetwork(() =>
            json({
              messages: [
                message("m9", did, {
                  sentAt: "2026-11-12T09:30:02.000Z",
                  text: "Thanks for writing!",
                }),
                message("m8", did, {
                  sentAt: "2026-11-12T09:00:00.000Z",
                  text: "Thanks for writing!",
                }),
              ],
            })
          );

          assert.deepStrictEqual(
            yield* found.platform.resume(found.account, outgoing),
            { _tag: "sent", platformMessageId: "m9" }
          );
          assert.isTrue(
            found.server.requests().every(({ method }) => method === "GET")
          );

          const twice = yield* onNetwork(() =>
            json({
              messages: [
                message("m9", did, {
                  sentAt: "2026-11-12T09:30:02.000Z",
                  text: "Thanks for writing!",
                }),
                message("m10", did, {
                  sentAt: "2026-11-12T09:30:03.000Z",
                  text: "Thanks for writing!",
                }),
              ],
            })
          );

          assert.deepStrictEqual(
            yield* twice.platform.resume(twice.account, outgoing),
            { _tag: "unconfirmed", reason: "interrupted" }
          );

          const taken = yield* twice.platform.resume(twice.account, {
            ...outgoing,
            takenIds: ["m10"],
          });

          assert.deepStrictEqual(taken, {
            _tag: "sent",
            platformMessageId: "m9",
          });

          const none = yield* onNetwork(() => json({ messages: [] }));

          assert.deepStrictEqual(
            yield* none.platform.resume(none.account, outgoing),
            { _tag: "unconfirmed", reason: "interrupted" }
          );
        })
      )
  );
});
