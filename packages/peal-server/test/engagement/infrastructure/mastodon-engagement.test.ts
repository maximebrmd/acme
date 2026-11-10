import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import type { ReplyFailure } from "#engagement/domain/reply.ts";
import { mastodonEngagement } from "#engagement/infrastructure/platforms/mastodon/mastodon-engagement.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { replyId, threadId } from "#test/engagement/support.ts";
import {
  dropped,
  empty,
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

// Mastodon's comments against a loopback server that answers as Mastodon's
// API reference says: the context of a status, statuses made under an
// Idempotency-Key, favourites and deletions.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000e1");

const status = (
  id: string,
  changed: { readonly [field: string]: JsonValue } = {}
): JsonValue => ({
  account: {
    acct: "reader@social.example",
    display_name: "Reader",
    id: "7001",
  },
  content: `<p>Comment ${id}</p>`,
  created_at: "2026-11-10T09:05:00.000Z",
  id,
  in_reply_to_id: "1001",
  url: `https://social.example/@reader/${id}`,
  visibility: "public",
  ...changed,
});

const bodyOf = jsonBodyOf(
  Schema.Struct({ in_reply_to_id: Schema.String, status: Schema.String })
);

// The adapter on a server answering with `handle`, as an account on it.
const onServer = Effect.fnUntraced(function* onServer(
  handle: (request: PlatformRequest) => PlatformAnswer,
  options: {
    readonly scopes?: readonly string[];
    readonly tokens?: readonly string[];
  } = {}
) {
  const server = yield* platformServer(handle);

  const account: ChannelAccount = {
    accountId: `109372@${new URL(server.url).host}`,
    channelId,
    connection: Option.none(),
    platform: "mastodon",
    scopes: options.scopes ?? ["read:statuses", "write:statuses"],
  };

  const platform = yield* Effect.gen(function* building() {
    return yield* mastodonEngagement({
      http: yield* publicHttpClient,
      scheme: "http:",
    });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        channelAccessOf(account, options.tokens ?? ["token-1"]),
        FetchHttpClient.layer,
        OpenOutboundGuard
      )
    )
  );

  return { account, platform, server };
});

// A header of the first request the server received.
const firstHeader = (
  server: { readonly requests: () => readonly PlatformRequest[] },
  name: string
) => {
  const [request] = server.requests();

  return request === undefined ? "(no request)" : headerOf(request, name);
};

const toRead = [
  { platformPostId: PlatformPostIdSchema.make("1001"), threadId: threadId(1) },
];

const outgoing = {
  createdAt: DateTime.makeUnsafe("2026-11-10T09:20:00.000Z"),
  parentPlatformId: "2001",
  replyId: replyId(1),
  rootPlatformPostId: "1001",
  text: "@reader@social.example Thank you!",
};

describe("Mastodon's comments", () => {
  it.effect(
    "reads a status's public replies as text, with what each answers",
    () =>
      Effect.gen(function* reads() {
        const { account, platform, server } = yield* onServer(() =>
          json({
            ancestors: [],
            descendants: [
              status("2001", {
                content:
                  '<p>Is it <a href="https://example.com">open</a> &amp; free?<br>Thanks</p><p>&lt;b&gt;</p>',
                favourited: true,
              }),
              status("2002", {
                account: { acct: "studio", display_name: "", id: "109372" },
                in_reply_to_id: "2001",
              }),
              // A reply only the people it mentions see is a private message.
              status("2003", { visibility: "direct" }),
            ],
          })
        );

        const batch = yield* platform.read(account, toRead);
        const [request] = server.requests();
        const [reading] = batch.readings;

        assert.strictEqual(request?.path, "/api/v1/statuses/1001/context");
        assert.strictEqual(
          firstHeader(server, "authorization"),
          "Bearer token-1"
        );
        assert.isFalse(batch.halted);
        assert.strictEqual(reading?._tag, "read");

        if (reading?._tag !== "read") {
          return;
        }

        // The private reply was left out, so the read is not all of them.
        assert.isFalse(reading.complete);
        assert.deepStrictEqual(
          reading.comments.map((comment) => ({
            fromAccount: comment.fromAccount,
            handle: comment.author.handle,
            liked: comment.liked,
            parent: comment.parentPlatformId,
            text: comment.text,
          })),
          [
            {
              fromAccount: false,
              handle: "reader@social.example",
              liked: Option.some(true),
              parent: Option.none(),
              text: "Is it open & free?\nThanks\n\n<b>",
            },
            {
              fromAccount: true,
              handle: "studio",
              liked: Option.none(),
              parent: Option.some("2001"),
              text: "Comment 2002",
            },
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads the comments under every part of a thread, and knows its parts as the account's",
    () =>
      Effect.gen(function* reads() {
        const studio = { acct: "studio", display_name: "", id: "109372" };

        // A post of three parts (1001, then 1002 and 1003, each a reply to
        // the part before), with a comment under each.
        const { account, platform } = yield* onServer(() =>
          json({
            ancestors: [],
            descendants: [
              status("2001"),
              status("1002", { account: studio }),
              status("2002", { in_reply_to_id: "1002" }),
              status("1003", { account: studio, in_reply_to_id: "1002" }),
              status("2003", { in_reply_to_id: "1003" }),
            ],
          })
        );

        const [reading] = (yield* platform.read(account, toRead)).readings;

        assert.strictEqual(reading?._tag, "read");

        if (reading?._tag !== "read") {
          return;
        }

        assert.isTrue(reading.complete);
        assert.deepStrictEqual(
          reading.comments.map((comment) => [
            comment.platformCommentId,
            comment.fromAccount,
            Option.getOrNull(comment.parentPlatformId),
          ]),
          [
            ["2001", false, null],
            ["1002", true, null],
            ["2002", false, "1002"],
            ["1003", true, "1002"],
            ["2003", false, "1003"],
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads without a token when the account did not allow reading",
    () =>
      Effect.gen(function* reads() {
        const { account, platform, server } = yield* onServer(
          () => json({ ancestors: [], descendants: [status("2001")] }),
          { scopes: ["write:statuses"] }
        );

        const batch = yield* platform.read(account, toRead);

        assert.strictEqual(firstHeader(server, "authorization"), "");
        assert.deepStrictEqual(
          batch.readings.map((reading) =>
            reading._tag === "read" ? reading.complete : reading._tag
          ),
          [true]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "tells a post that is gone from a server that slows down or fails",
    () =>
      Effect.gen(function* reads() {
        const answers = new Map([
          [
            "/api/v1/statuses/1001/context",
            json({ error: "Record not found" }, 404),
          ],
          ["/api/v1/statuses/1002/context", empty(503)],
          ["/api/v1/statuses/1003/context", empty(429)],
        ]);

        const { account, platform, server } = yield* onServer(
          (request) => answers.get(request.path) ?? empty(500)
        );

        const batch = yield* platform.read(
          account,
          ["1001", "1002", "1003", "1004"].map((id, index) => ({
            platformPostId: PlatformPostIdSchema.make(id),
            threadId: threadId(index + 1),
          }))
        );

        assert.isTrue(batch.halted);
        assert.deepStrictEqual(
          batch.readings.map(({ _tag }) => _tag),
          ["missing", "failed"]
        );
        // Nothing is asked once the server said to slow down.
        assert.lengthOf(server.requests(), 3);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "refuses a token only on Mastodon's own error, never a proxy's page",
    () =>
      Effect.gen(function* reads() {
        const mastodon = yield* onServer(() =>
          json({ error: "The access token is invalid" }, 401)
        );

        const refused = yield* mastodon.platform
          .read(mastodon.account, toRead)
          .pipe(Effect.flip);

        // Renewed once, refused again: the channel needs reconnecting.
        assert.deepStrictEqual(
          [refused._tag, "reason" in refused ? refused.reason : ""],
          ["ChannelUnreadable", "paused"]
        );

        const proxy = yield* onServer(() => empty(403));
        const batch = yield* proxy.platform.read(proxy.account, toRead);

        assert.deepStrictEqual(
          batch.readings.map(({ _tag }) => _tag),
          ["failed"]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "sends a reply as a status under the comment, keyed by the reply's id",
    () =>
      Effect.gen(function* sends() {
        const { account, platform, server } = yield* onServer(() =>
          json({ id: "3001", url: "https://social.example/@studio/3001" })
        );

        const outcome = yield* platform.send(account, outgoing);
        const [request] = server.requests();

        assert.deepStrictEqual(outcome, {
          _tag: "sent",
          permalink: Option.some("https://social.example/@studio/3001"),
          platformCommentId: "3001",
        });
        assert.strictEqual(
          `${request?.method} ${request?.path}`,
          "POST /api/v1/statuses"
        );
        assert.strictEqual(firstHeader(server, "idempotency-key"), replyId(1));
        assert.isDefined(request);
        assert.deepStrictEqual(bodyOf(request), {
          in_reply_to_id: "2001",
          status: "@reader@social.example Thank you!",
        });
      }).pipe(Effect.scoped)
  );

  it.effect(
    "cannot tell whether a reply went out when no answer came, or the server failed on it",
    () =>
      Effect.gen(function* sends() {
        for (const answer of [dropped, empty(502)]) {
          const { account, platform } = yield* onServer(() => answer);

          assert.deepStrictEqual(yield* platform.send(account, outgoing), {
            _tag: "unconfirmed",
            reason: "noResponse",
          });
        }
      }).pipe(Effect.scoped)
  );

  it.effect("says why nothing went out when the server refused", () =>
    Effect.gen(function* sends() {
      const refusals: readonly (readonly [PlatformAnswer, ReplyFailure])[] = [
        [json({ error: "Record not found" }, 404), "commentGone"],
        [json({ error: "Validation failed" }, 422), "refused"],
        [empty(429), "rateLimited"],
        [
          json({ error: "The access token is invalid" }, 401),
          "reconnectNeeded",
        ],
      ];

      for (const [answer, reason] of refusals) {
        const { account, platform } = yield* onServer(() => answer);

        assert.deepStrictEqual(yield* platform.send(account, outgoing), {
          _tag: "failed",
          reason,
        });
      }
    }).pipe(Effect.scoped)
  );

  it.effect(
    "resumes under the same key while Mastodon keeps it, and never after",
    () =>
      Effect.gen(function* resumes() {
        const { account, platform, server } = yield* onServer(() =>
          json({ id: "3001", url: null })
        );

        yield* TestClock.setTime(
          DateTime.toEpochMillis(
            DateTime.makeUnsafe("2026-11-10T10:09:00.000Z")
          )
        );

        const within = yield* platform.resume(account, outgoing);

        assert.strictEqual(within._tag, "sent");
        assert.strictEqual(firstHeader(server, "idempotency-key"), replyId(1));

        yield* TestClock.setTime(
          DateTime.toEpochMillis(
            DateTime.makeUnsafe("2026-11-10T10:10:00.000Z")
          )
        );

        assert.deepStrictEqual(yield* platform.resume(account, outgoing), {
          _tag: "unconfirmed",
          reason: "interrupted",
        });
        assert.lengthOf(server.requests(), 1);
      }).pipe(Effect.scoped)
  );

  it.effect("favourites, takes a reply back, and hides nothing", () =>
    Effect.gen(function* acts() {
      const { account, platform, server } = yield* onServer((request) =>
        request.method === "DELETE"
          ? json({ error: "Record not found" }, 404)
          : json({ id: "2001" })
      );

      const target = {
        platformCommentId: "2001",
        receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
        rootPlatformPostId: "1001",
      };

      assert.deepStrictEqual(
        yield* platform.moderate(account, { ...target, action: "like" }),
        { _tag: "done" }
      );
      assert.deepStrictEqual(
        yield* platform.moderate(account, { ...target, action: "unlike" }),
        { _tag: "done" }
      );
      // Already gone is done.
      assert.deepStrictEqual(yield* platform.withdraw(account, "3001"), {
        _tag: "done",
      });
      assert.deepStrictEqual(
        yield* platform.moderate(account, { ...target, action: "hide" }),
        { _tag: "failed", reason: "refused" }
      );
      assert.deepStrictEqual(
        server.requests().map(({ method, path }) => `${method} ${path}`),
        [
          "POST /api/v1/statuses/2001/favourite",
          "POST /api/v1/statuses/2001/unfavourite",
          "DELETE /api/v1/statuses/3001",
        ]
      );
    }).pipe(Effect.scoped)
  );
});
