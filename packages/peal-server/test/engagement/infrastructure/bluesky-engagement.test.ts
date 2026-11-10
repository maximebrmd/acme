import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { maxFollowUps } from "peal-contract/post-text";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import {
  blueskyEngagement,
  threadDepth,
} from "#engagement/infrastructure/platforms/bluesky/bluesky-engagement.ts";
import { maxThreadBytes } from "#engagement/infrastructure/platforms/thread-body.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { recordKeyOf } from "#shared/infrastructure/platforms/bluesky/record-key.ts";
import {
  publicHttpClient,
  publicHttpClientWith,
} from "#shared/infrastructure/platforms/public-http.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { replyId, threadId } from "#test/engagement/support.ts";
import {
  dropped,
  empty,
  json,
  jsonBodyOf,
  rawJson,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";
import { blueskySession } from "#test/publishing/platforms/support.ts";

// Bluesky's comments against one loopback server standing for the public
// AppView and the account's PDS, answering as the lexicons say. It checks
// no DPoP proof: the sender has its own tests.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000e2");

const did = "did:plc:synthetic0studio0account";
const reader = "did:plc:synthetic0reader00000000";

const root = `at://${did}/app.bsky.feed.post/3lroot`;
const first = `at://${reader}/app.bsky.feed.post/3lfirst`;
const second = `at://${did}/app.bsky.feed.post/3lsecond`;

const view = (
  uri: string,
  author: string,
  parent: string,
  replyCount = 0,
  more: { readonly [field: string]: JsonValue } = {}
): JsonValue => ({
  ...more,
  author: { did: author, displayName: "Reader", handle: "reader.example" },
  cid: `cid-${uri.slice(-6)}`,
  indexedAt: "2026-11-10T09:06:00.000Z",
  record: {
    createdAt: "2026-11-10T09:05:00.000Z",
    reply: { parent: { uri: parent } },
    text: `Text of ${uri.slice(-6)}`,
  },
  replyCount,
  uri,
});

const WriteSchema = Schema.Struct({
  collection: Schema.String,
  record: Schema.optionalKey(Schema.Record(Schema.String, Schema.Json)),
  repo: Schema.String,
  rkey: Schema.String,
  swapRecord: Schema.optionalKey(Schema.String),
});

const writeOf = jsonBodyOf(WriteSchema);

const onNetwork = Effect.fnUntraced(function* onNetwork(
  handle: (request: PlatformRequest) => PlatformAnswer,
  // Where the answers threads are read from end.
  readerBytes: number = maxThreadBytes
) {
  const server = yield* platformServer(handle);

  const account: ChannelAccount = {
    accountId: did,
    channelId,
    connection: Option.none(),
    platform: "bluesky",
    scopes: ["atproto", "transition:generic"],
  };

  const session = yield* blueskySession({
    accessToken: "access-1",
    did,
    expiresAt: DateTime.addDuration(yield* DateTime.now, "1 hour"),
    pds: server.url,
  });

  const platform = yield* Effect.gen(function* building() {
    return yield* blueskyEngagement({
      appView: new URL(server.url),
      http: yield* publicHttpClient,
      reader: yield* publicHttpClientWith({
        maxResponseBytes: readerBytes,
        overflow: "truncate",
        timeout: "20 seconds",
      }),
    });
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

  const writes = () =>
    server
      .requests()
      .filter(({ method }) => method === "POST")
      .map((request) => ({
        ...writeOf(request),
        method: request.path.split(".").at(-1),
      }));

  return { account, platform, server, writes };
});

const toRead = [
  { platformPostId: PlatformPostIdSchema.make(root), threadId: threadId(1) },
];

const outgoing = {
  createdAt: DateTime.makeUnsafe("2026-11-10T09:20:00.000Z"),
  parentPlatformId: first,
  replyId: replyId(1),
  rootPlatformPostId: root,
  text: "Thank you! https://example.com",
};

const recordKey = recordKeyOf(outgoing.createdAt, outgoing.replyId);

const cids = json({
  posts: [
    { cid: "cid-root", uri: root },
    { cid: "cid-first", uri: first },
  ],
});

const notFound = json({ error: "RecordNotFound" }, 400);

describe("Bluesky's comments", () => {
  it.effect(
    "reads the start of a thread too large for one answer, and says it is not all of it",
    () =>
      Effect.gen(function* readsLarge() {
        const replies = Array.from({ length: 2000 }, (_, index) => ({
          post: view(
            `at://${reader}/app.bsky.feed.post/3l${String(index).padStart(4, "0")}`,
            reader,
            root
          ),
          replies: [],
        }));

        const { account, platform } = yield* onNetwork(
          () =>
            json({
              thread: {
                post: view(root, did, root, replies.length),
                replies,
              },
            }),
          64 * 1024
        );

        const batch = yield* platform.read(account, toRead);
        const [reading] = batch.readings;

        assert.strictEqual(reading?._tag, "read");

        if (reading?._tag !== "read") {
          return;
        }

        assert.isAbove(reading.comments.length, 50);
        assert.isBelow(reading.comments.length, 2000);
        assert.isFalse(reading.complete);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads a post's thread from the AppView, with what each reply answers and what is hidden",
    () =>
      Effect.gen(function* reads() {
        const { account, platform, server } = yield* onNetwork(() =>
          json({
            thread: {
              post: view(root, did, root, 1, {
                threadgate: { record: { hiddenReplies: [first] } },
              }),
              replies: [
                {
                  post: view(first, reader, root, 1),
                  replies: [{ post: view(second, did, first) }],
                },
              ],
            },
          })
        );

        const batch = yield* platform.read(account, toRead);
        const [request] = server.requests();
        const [reading] = batch.readings;

        assert.strictEqual(request?.path, "/xrpc/app.bsky.feed.getPostThread");
        assert.strictEqual(request?.query.get("uri"), root);
        // Public: no session goes to the AppView.
        assert.isUndefined(request?.headers["authorization"]);
        assert.strictEqual(reading?._tag, "read");

        if (reading?._tag !== "read") {
          return;
        }

        assert.isTrue(reading.complete);
        assert.deepStrictEqual(
          reading.comments.map((comment) => ({
            fromAccount: comment.fromAccount,
            hidden: comment.hidden,
            id: comment.platformCommentId,
            parent: comment.parentPlatformId,
            permalink: comment.permalink,
          })),
          [
            {
              fromAccount: false,
              hidden: true,
              id: first,
              parent: Option.none(),
              permalink: Option.some(
                `https://bsky.app/profile/${reader}/post/3lfirst`
              ),
            },
            {
              fromAccount: true,
              hidden: false,
              id: second,
              parent: Option.some(first),
              permalink: Option.some(
                `https://bsky.app/profile/${did}/post/3lsecond`
              ),
            },
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads the comments under every part of a thread, however long, and knows its parts as the account's",
    () =>
      Effect.gen(function* reads() {
        const part2 = `at://${did}/app.bsky.feed.post/3lpart2`;
        const part3 = `at://${did}/app.bsky.feed.post/3lpart3`;
        const under2 = `at://${reader}/app.bsky.feed.post/3lunder2`;
        const under3 = `at://${reader}/app.bsky.feed.post/3lunder3`;

        // A post of three parts, each a reply to the part before, with a
        // comment under each.
        const { account, platform, server } = yield* onNetwork(() =>
          json({
            thread: {
              post: view(root, did, root, 2),
              replies: [
                { post: view(first, reader, root) },
                {
                  post: view(part2, did, root, 2),
                  replies: [
                    { post: view(under2, reader, part2) },
                    {
                      post: view(part3, did, part2, 1),
                      replies: [{ post: view(under3, reader, part3) }],
                    },
                  ],
                },
              ],
            },
          })
        );

        const [reading] = (yield* platform.read(account, toRead)).readings;
        const [request] = server.requests();

        // Deep enough for the comments under the last part of the longest
        // post, and the replies to them.
        assert.strictEqual(threadDepth, maxFollowUps + 1 + 10);
        assert.strictEqual(request?.query.get("depth"), String(threadDepth));
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
            [first, false, null],
            [part2, true, null],
            [under2, false, part2],
            [part3, true, part2],
            [under3, false, part3],
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "deletes nothing after a thread the AppView did not show whole",
    () =>
      Effect.gen(function* reads() {
        const { account, platform } = yield* onNetwork(() =>
          json({
            thread: {
              post: view(root, did, root, 3),
              replies: [
                { post: view(first, reader, root) },
                { notFound: true, uri: `${first}x` },
              ],
            },
          })
        );

        const [reading] = (yield* platform.read(account, toRead)).readings;

        assert.deepStrictEqual(
          reading?._tag === "read"
            ? [reading.complete, reading.comments.length]
            : [],
          [false, 1]
        );
      }).pipe(Effect.scoped)
  );

  it.effect("tells a post that is gone from an AppView that slows down", () =>
    Effect.gen(function* reads() {
      const gone = yield* onNetwork(() => json({ error: "NotFound" }, 400));
      const slow = yield* onNetwork(() => empty(429));

      assert.deepStrictEqual(
        (yield* gone.platform.read(gone.account, toRead)).readings.map(
          ({ _tag }) => _tag
        ),
        ["missing"]
      );
      assert.deepStrictEqual(yield* slow.platform.read(slow.account, toRead), {
        halted: true,
        readings: [],
      });
    }).pipe(Effect.scoped)
  );

  it.effect(
    "sends a reply as a post record under the comment and the root, at a key the reply gives",
    () =>
      Effect.gen(function* sends() {
        const { account, platform, writes } = yield* onNetwork((request) =>
          request.method === "GET"
            ? cids
            : json({
                cid: "cid-reply",
                uri: `at://${did}/app.bsky.feed.post/${recordKey}`,
              })
        );

        const outcome = yield* platform.send(account, outgoing);
        const [write] = writes();

        assert.deepStrictEqual(outcome, {
          _tag: "sent",
          permalink: Option.some(
            `https://bsky.app/profile/${did}/post/${recordKey}`
          ),
          platformCommentId: `at://${did}/app.bsky.feed.post/${recordKey}`,
        });
        assert.deepStrictEqual(
          [write?.method, write?.collection, write?.repo, write?.rkey],
          ["createRecord", "app.bsky.feed.post", did, recordKey]
        );
        assert.deepStrictEqual(write?.record?.["reply"], {
          parent: { cid: "cid-first", uri: first },
          root: { cid: "cid-root", uri: root },
        });
        assert.strictEqual(write?.record?.["text"], outgoing.text);
        assert.strictEqual(
          write?.record?.["createdAt"],
          "2026-11-10T09:20:00.000Z"
        );
        // The link is marked, so Bluesky shows it as one.
        assert.isArray(write?.record?.["facets"]);
      }).pipe(Effect.scoped)
  );

  it.effect("sends nothing to a comment the AppView no longer has", () =>
    Effect.gen(function* sends() {
      const { account, platform, writes } = yield* onNetwork(() =>
        json({ posts: [{ cid: "cid-root", uri: root }] })
      );

      assert.deepStrictEqual(yield* platform.send(account, outgoing), {
        _tag: "failed",
        reason: "commentGone",
      });
      assert.lengthOf(writes(), 0);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "cannot tell whether a reply went out when the PDS did not answer the create",
    () =>
      Effect.gen(function* sends() {
        for (const answer of [dropped, empty(502)]) {
          const { account, platform } = yield* onNetwork((request) =>
            request.method === "GET" ? cids : answer
          );

          assert.deepStrictEqual(yield* platform.send(account, outgoing), {
            _tag: "unconfirmed",
            reason: "noResponse",
          });
        }
      }).pipe(Effect.scoped)
  );

  it.effect(
    "resumes by reading the record back: found is sent, absent is created, anything else is unknown",
    () =>
      Effect.gen(function* resumes() {
        const found = yield* onNetwork(() =>
          json({
            uri: `at://${did}/app.bsky.feed.post/${recordKey}`,
            value: {
              createdAt: "2026-11-10T09:20:00.000Z",
              text: outgoing.text,
            },
          })
        );

        assert.strictEqual(
          (yield* found.platform.resume(found.account, outgoing))._tag,
          "sent"
        );
        assert.lengthOf(found.writes(), 0);
        assert.strictEqual(
          found.server.requests()[0]?.query.get("rkey"),
          recordKey
        );

        const absent = yield* onNetwork((request) => {
          if (request.path.endsWith("getRecord")) {
            return notFound;
          }

          return request.method === "GET" ? cids : json({ uri: "at://x/y/z" });
        });

        assert.strictEqual(
          (yield* absent.platform.resume(absent.account, outgoing))._tag,
          "sent"
        );
        assert.lengthOf(absent.writes(), 1);

        const unknown = yield* onNetwork(() => empty(503));

        assert.deepStrictEqual(
          yield* unknown.platform.resume(unknown.account, outgoing),
          { _tag: "unconfirmed", reason: "interrupted" }
        );
        assert.lengthOf(unknown.writes(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "hides a reply in the post's thread gate, keeping who may reply",
    () =>
      Effect.gen(function* hides() {
        const { account, platform, writes } = yield* onNetwork((request) =>
          request.method === "GET"
            ? json({
                cid: "cid-gate",
                uri: `at://${did}/app.bsky.feed.threadgate/3lroot`,
                value: {
                  $type: "app.bsky.feed.threadgate",
                  allow: [{ $type: "app.bsky.feed.threadgate#followingRule" }],
                  createdAt: "2026-11-10T09:00:00.000Z",
                  hiddenReplies: ["at://other/app.bsky.feed.post/3lold"],
                  post: root,
                },
              })
            : json({})
        );

        const target = {
          platformCommentId: first,
          receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
          rootPlatformPostId: root,
        };

        assert.deepStrictEqual(
          yield* platform.moderate(account, { ...target, action: "hide" }),
          { _tag: "done" }
        );

        const [write] = writes();

        assert.deepStrictEqual(
          [write?.method, write?.collection, write?.rkey, write?.swapRecord],
          ["putRecord", "app.bsky.feed.threadgate", "3lroot", "cid-gate"]
        );
        assert.deepStrictEqual(write?.record, {
          $type: "app.bsky.feed.threadgate",
          allow: [{ $type: "app.bsky.feed.threadgate#followingRule" }],
          createdAt: "2026-11-10T09:00:00.000Z",
          hiddenReplies: ["at://other/app.bsky.feed.post/3lold", first],
          post: root,
        });
      }).pipe(Effect.scoped)
  );

  it.effect(
    "gives a post without a gate one that hides the reply and limits nobody",
    () =>
      Effect.gen(function* hides() {
        const { account, platform, writes } = yield* onNetwork((request) =>
          request.method === "GET" ? notFound : json({})
        );

        yield* platform.moderate(account, {
          action: "hide",
          platformCommentId: first,
          receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
          rootPlatformPostId: root,
        });

        const [write] = writes();

        assert.deepStrictEqual(write?.record?.["hiddenReplies"], [first]);
        assert.strictEqual(write?.record?.["post"], root);
        // No rule: anyone may still reply.
        assert.notProperty(write?.record, "allow");
        assert.isUndefined(write?.swapRecord);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "takes a 401 or 403 for a refused session only when the PDS says so",
    () =>
      Effect.gen(function* refusals() {
        const target = {
          action: "like" as const,
          platformCommentId: first,
          receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
          rootPlatformPostId: root,
        };

        const likedOn = (answer: PlatformAnswer) =>
          onNetwork((request) =>
            request.method === "GET" ? cids : answer
          ).pipe(
            Effect.flatMap(({ account, platform }) =>
              platform.moderate(account, target)
            )
          );

        // Something on the way refused: the channel is left as it is.
        assert.deepStrictEqual(yield* likedOn(empty(401)), {
          _tag: "failed",
          reason: "platformUnavailable",
        });
        assert.deepStrictEqual(
          yield* likedOn(rawJson("<html>Forbidden</html>", 403)),
          { _tag: "failed", reason: "platformUnavailable" }
        );

        // The PDS refused the session itself: renewed, then reconnect.
        assert.deepStrictEqual(
          yield* likedOn(
            json({ error: "InvalidToken", message: "Bad token" }, 401)
          ),
          { _tag: "failed", reason: "reconnectNeeded" }
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "likes under a key the comment gives, takes the like back, and takes a reply back",
    () =>
      Effect.gen(function* acts() {
        const { account, platform, writes } = yield* onNetwork((request) =>
          request.method === "GET" ? cids : json({})
        );

        const target = {
          platformCommentId: first,
          receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
          rootPlatformPostId: root,
        };

        yield* platform.moderate(account, { ...target, action: "like" });
        yield* platform.moderate(account, { ...target, action: "unlike" });
        yield* platform.withdraw(account, second);

        const [like, unlike, withdrawn] = writes();

        assert.deepStrictEqual(
          [like?.method, like?.collection, like?.record?.["subject"]],
          ["putRecord", "app.bsky.feed.like", { cid: "cid-first", uri: first }]
        );
        assert.deepStrictEqual(
          [unlike?.method, unlike?.collection, unlike?.rkey],
          ["deleteRecord", "app.bsky.feed.like", like?.rkey]
        );
        assert.deepStrictEqual(
          [withdrawn?.method, withdrawn?.collection, withdrawn?.rkey],
          ["deleteRecord", "app.bsky.feed.post", "3lsecond"]
        );
        assert.deepStrictEqual(
          yield* platform.moderate(account, { ...target, action: "delete" }),
          { _tag: "failed", reason: "refused" }
        );
      }).pipe(Effect.scoped)
  );
});
