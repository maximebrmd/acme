import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { mastodonMessages } from "#engagement/infrastructure/platforms/mastodon/mastodon-messages.ts";
import type { OutgoingDirect } from "#engagement/infrastructure/platforms/message-platform.ts";
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

// Mastodon's direct messages against a loopback server that answers as
// Mastodon's API reference says: the account's conversations, paged by
// the Link header, a status's context, and statuses made under an
// Idempotency-Key.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000e2");

const now = DateTime.makeUnsafe("2026-11-12T10:00:00.000Z");

const keptSince = DateTime.subtractDuration(now, "30 days");

const reader = {
  acct: "reader@social.example",
  display_name: "Reader",
  id: "7001",
};

const studio = { acct: "studio", display_name: "", id: "109372" };

const status = (
  id: string,
  changed: { readonly [field: string]: JsonValue } = {}
): JsonValue => ({
  account: reader,
  content: `<p><span class="h-card"><a href="https://social.example/@studio">@studio</a></span> Message ${id}</p>`,
  created_at: "2026-11-12T09:00:00.000Z",
  id,
  in_reply_to_id: null,
  media_attachments: [],
  visibility: "direct",
  ...changed,
});

const conversation = (
  id: string,
  last: JsonValue,
  accounts: readonly JsonValue[] = [reader]
): JsonValue => ({
  accounts: [...accounts],
  id,
  last_status: last,
  unread: true,
});

const bodyOf = jsonBodyOf(
  Schema.Struct({
    in_reply_to_id: Schema.optionalKey(Schema.String),
    status: Schema.String,
    visibility: Schema.String,
  })
);

const onServer = Effect.fnUntraced(function* onServer(
  handle: (request: PlatformRequest, origin: string) => PlatformAnswer,
  tokens: readonly string[] = ["token-1"]
) {
  const server = yield* platformServer(handle);

  const account: ChannelAccount = {
    accountId: `109372@${new URL(server.url).host}`,
    channelId,
    connection: Option.none(),
    platform: "mastodon",
    scopes: ["read:statuses", "write:statuses"],
  };

  const platform = yield* Effect.gen(function* building() {
    return yield* mastodonMessages({
      http: yield* publicHttpClient,
      scheme: "http:",
    });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        channelAccessOf(account, tokens),
        FetchHttpClient.layer,
        OpenOutboundGuard
      )
    )
  );

  return { account, platform, server };
});

const outgoing: OutgoingDirect = {
  createdAt: DateTime.makeUnsafe("2026-11-12T09:30:00.000Z"),
  latestPlatformId: Option.some("3002"),
  messageId: outgoingMessageId(1),
  participants: [participant(1)],
  platformConversationId: "c1",
  request: false,
  takenIds: [],
  text: "@reader1@social.example Thanks!",
};

const at = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  TestClock.setTime(DateTime.toEpochMillis(now)).pipe(Effect.andThen(effect));

describe("Mastodon's direct messages", () => {
  it.effect(
    "reads a changed conversation whole from its first status, direct statuses only",
    () =>
      at(
        Effect.gen(function* reads() {
          const { account, platform, server } = yield* onServer((request) => {
            if (request.path === "/api/v1/conversations") {
              return json([
                conversation("c1", status("3002", { in_reply_to_id: "3001" }), [
                  reader,
                  studio,
                ]),
                conversation("c2", status("4001")),
              ]);
            }

            if (request.path === "/api/v1/statuses/3002/context") {
              return json({
                ancestors: [status("3001")],
                descendants: [],
              });
            }

            if (request.path === "/api/v1/statuses/3001/context") {
              return json({
                ancestors: [],
                descendants: [
                  status("3002", {
                    in_reply_to_id: "3001",
                    media_attachments: [{ id: "a1" }],
                  }),
                  status("3003", {
                    account: studio,
                    content: "<p>On our way</p>",
                    in_reply_to_id: "3002",
                  }),
                  // A public reply in the thread is no message.
                  status("3004", { visibility: "public" }),
                ],
              });
            }

            return json({ error: "Record not found" }, 404);
          });

          const batch = yield* platform.read(account, {
            keptSince,
            known: new Map([["c2", "4001"]]),
          });

          assert.isFalse(batch.halted);
          assert.deepStrictEqual(
            server.requests().map(({ path }) => path),
            [
              "/api/v1/conversations",
              "/api/v1/statuses/3002/context",
              "/api/v1/statuses/3001/context",
            ]
          );
          const [listing] = server.requests();

          assert.strictEqual(
            listing === undefined ? "" : headerOf(listing, "authorization"),
            "Bearer token-1"
          );

          const [reading] = batch.conversations;

          assert.strictEqual(batch.conversations.length, 1);
          assert.deepInclude(reading, {
            complete: true,
            platformConversationId: "c1",
            request: false,
            revision: "3002",
          });
          assert.deepStrictEqual(
            reading?.participants.map(({ handle }) => handle),
            ["reader@social.example"]
          );
          assert.deepStrictEqual(
            reading?.messages.map((message) => ({
              attachments: message.attachments,
              fromAccount: message.fromAccount,
              id: message.platformMessageId,
              text: message.text,
            })),
            [
              {
                attachments: 0,
                fromAccount: false,
                id: "3001",
                text: "@studio Message 3001",
              },
              {
                attachments: 1,
                fromAccount: false,
                id: "3002",
                text: "@studio Message 3002",
              },
              {
                attachments: 0,
                fromAccount: true,
                id: "3003",
                text: "On our way",
              },
            ]
          );
        })
      )
  );

  it.effect(
    "follows the Link header on the instance, and stops past what Peal keeps",
    () =>
      at(
        Effect.gen(function* pages() {
          const { account, platform, server } = yield* onServer(
            (request, origin) => {
              if (request.path !== "/api/v1/conversations") {
                return json({ ancestors: [], descendants: [] });
              }

              if (request.query.get("max_id") === null) {
                return json([conversation("c1", status("5001"))], 200, {
                  link: `<${origin}/api/v1/conversations?limit=40&max_id=9>; rel="next", <${origin}/api/v1/conversations?min_id=1>; rel="prev"`,
                });
              }

              return json(
                [
                  conversation(
                    "c9",
                    status("9001", { created_at: "2026-09-01T09:00:00.000Z" })
                  ),
                ],
                200,
                {
                  link: `<${origin}/api/v1/conversations?limit=40&max_id=1>; rel="next"`,
                }
              );
            }
          );

          const batch = yield* platform.read(account, {
            keptSince,
            known: new Map(),
          });

          assert.deepStrictEqual(
            batch.conversations.map(
              ({ platformConversationId }) => platformConversationId
            ),
            ["c1"]
          );
          assert.lengthOf(
            server
              .requests()
              .filter(({ path }) => path === "/api/v1/conversations"),
            2
          );
        })
      )
  );

  it.effect("never follows a next page on another host", () =>
    at(
      Effect.gen(function* elsewhere() {
        const { account, platform, server } = yield* onServer((request) =>
          request.path === "/api/v1/conversations"
            ? json([conversation("c1", status("5001"))], 200, {
                link: '<https://elsewhere.example/api/v1/conversations?max_id=9>; rel="next"',
              })
            : json({ ancestors: [], descendants: [] })
        );

        yield* platform.read(account, { keptSince, known: new Map() });

        assert.lengthOf(
          server
            .requests()
            .filter(({ path }) => path === "/api/v1/conversations"),
          1
        );
      })
    )
  );

  it.effect(
    "fails a read on Mastodon's refusal of the token, renewing it",
    () =>
      at(
        Effect.gen(function* refused() {
          const { account, platform, server } = yield* onServer(
            (request) =>
              headerOf(request, "authorization") === "Bearer token-1"
                ? json({ error: "The access token is invalid" }, 401)
                : json([]),
            ["token-1", "token-2"]
          );

          const batch = yield* platform.read(account, {
            keptSince,
            known: new Map(),
          });

          assert.deepStrictEqual(batch.conversations, []);
          assert.lengthOf(server.requests(), 2);
        })
      )
  );

  it.effect("puts a read off when the instance asks to slow down", () =>
    at(
      Effect.gen(function* slowed() {
        const { account, platform } = yield* onServer(() =>
          json({ error: "Too many requests" }, 429)
        );

        const failure = yield* platform
          .read(account, { keptSince, known: new Map() })
          .pipe(Effect.flip);

        assert.strictEqual(failure._tag, "RateLimited");
      })
    )
  );

  it.effect(
    "sends a direct status answering the latest, under the message's Idempotency-Key",
    () =>
      at(
        Effect.gen(function* sends() {
          const { account, platform, server } = yield* onServer(() =>
            json({ id: "6001" })
          );

          const outcome = yield* platform.send(account, outgoing);
          const [request] = server.requests();

          assert.deepStrictEqual(outcome, {
            _tag: "sent",
            platformMessageId: "6001",
          });
          assert.strictEqual(request?.path, "/api/v1/statuses");
          assert.strictEqual(
            request === undefined ? "" : headerOf(request, "idempotency-key"),
            outgoingMessageId(1)
          );
          assert.deepStrictEqual(
            request === undefined ? undefined : bodyOf(request),
            {
              in_reply_to_id: "3002",
              status: "@reader1@social.example Thanks!",
              visibility: "direct",
            }
          );
        })
      )
  );

  it.effect("leaves a message whose answer was lost unconfirmed", () =>
    at(
      Effect.gen(function* lost() {
        const { account, platform } = yield* onServer(() => dropped);

        assert.deepStrictEqual(yield* platform.send(account, outgoing), {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
      })
    )
  );

  it.effect(
    "resumes under the same key within the hour, failed only on Mastodon's 422",
    () =>
      at(
        Effect.gen(function* resumes() {
          const made = yield* onServer(() => json({ id: "6001" }));

          assert.deepStrictEqual(
            yield* made.platform.resume(made.account, outgoing),
            { _tag: "sent", platformMessageId: "6001" }
          );

          const invalid = yield* onServer(() =>
            json({ error: "Validation failed: Text can't be blank" }, 422)
          );

          assert.deepStrictEqual(
            yield* invalid.platform.resume(invalid.account, outgoing),
            { _tag: "failed", reason: "refused" }
          );

          const proxy = yield* onServer(() => json({ page: "busy" }, 429));

          assert.deepStrictEqual(
            yield* proxy.platform.resume(proxy.account, outgoing),
            { _tag: "unconfirmed", reason: "interrupted" }
          );
        })
      )
  );

  it.effect("never resends once the key may have lapsed", () =>
    Effect.gen(function* late() {
      yield* TestClock.setTime(
        DateTime.toEpochMillis(
          DateTime.addDuration(outgoing.createdAt, "55 minutes")
        )
      );

      const { account, platform, server } = yield* onServer(() =>
        json({ id: "6001" })
      );

      assert.deepStrictEqual(yield* platform.resume(account, outgoing), {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.lengthOf(server.requests(), 0);
    })
  );
});
