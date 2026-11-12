import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { facebookEngagement } from "#engagement/infrastructure/platforms/meta/facebook-engagement.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { fakeMetaComments } from "#test/engagement/fakes/fake-meta-comments.ts";
import type { FakeMetaCommentsOptions } from "#test/engagement/fakes/fake-meta-comments.ts";
import { replyId, threadId } from "#test/engagement/support.ts";
import {
  businessUsage,
  facebookPageId,
  graphAppSecret,
  metaError,
} from "#test/publishing/fakes/fake-meta-graph.ts";
import { dropped, json } from "#test/publishing/fakes/platform-server.ts";

// A Facebook Page's comments against a loopback Graph that answers as
// Meta's references say: a post's comments at every level, a comment's
// replies, replies made, hidden and deleted.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000f2");

const postId = `${facebookPageId}_1001`;

const granted = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_read_user_content",
  "pages_manage_engagement",
];

const reader = { id: "7100000000000001", name: "Synthetic Reader" };

const page = { id: facebookPageId, name: "Synthetic Page" };

const toRead = [
  { platformPostId: PlatformPostIdSchema.make(postId), threadId: threadId(1) },
];

const outgoing = {
  createdAt: DateTime.makeUnsafe("2026-11-10T09:20:00.000Z"),
  parentPlatformId: "2001",
  replyId: replyId(1),
  rootPlatformPostId: postId,
  text: "Thank you, synthetic reader!",
};

// The adapter on a fake Graph, as the Page.
const onGraph = Effect.fnUntraced(function* onGraph(
  options: FakeMetaCommentsOptions & {
    readonly scopes?: readonly string[];
  } = {}
) {
  const graph = yield* fakeMetaComments(["page-token-1"], options);
  const url = new URL(graph.url);

  const account: ChannelAccount = {
    accountId: facebookPageId,
    channelId,
    connection: Option.none(),
    platform: "facebook",
    scopes: options.scopes ?? granted,
  };

  const platform = yield* Effect.gen(function* building() {
    return yield* facebookEngagement({
      appSecret: Option.some(Redacted.make(graphAppSecret)),
      hosts: { ...metaHosts, facebookGraph: url, instagramGraph: url },
      http: yield* publicHttpClient,
    });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        channelAccessOf(account, ["page-token-1"]),
        FetchHttpClient.layer,
        OpenOutboundGuard,
        Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
      )
    )
  );

  return { account, graph, platform };
});

const comment = (
  n: number,
  changed: Partial<
    Parameters<Effect.Success<ReturnType<typeof onGraph>>["graph"]["add"]>[0]
  > = {}
) => ({
  createdTime: `2026-11-10T09:0${String(n % 10)}:00+0000`,
  from: reader,
  id: String(2000 + n),
  objectId: postId,
  text: `Comment ${String(n)}`,
  ...changed,
});

describe("Facebook Pages' comments", () => {
  it.effect("reads a thread across pages, with every level", () =>
    Effect.gen(function* across() {
      const { account, graph, platform } = yield* onGraph();

      for (let n = 1; n <= 30; n += 1) {
        graph.add(comment(n));
      }

      graph.add(comment(31, { parentId: "2001" }));

      const batch = yield* platform.read(account, toRead);
      const [reading] = batch.readings;

      assert.isFalse(batch.halted);
      assert.strictEqual(reading?._tag, "read");

      if (reading?._tag !== "read") {
        return;
      }

      assert.isTrue(reading.complete);
      assert.lengthOf(reading.comments, 31);
      assert.deepStrictEqual(
        reading.comments.at(-1)?.parentPlatformId,
        Option.some("2001")
      );
      assert.deepStrictEqual(
        reading.comments[0]?.writtenAt,
        DateTime.makeUnsafe("2026-11-10T09:01:00.000Z")
      );

      const requests = graph.requests();

      assert.lengthOf(requests, 2);
      assert.strictEqual(requests[0]?.query.get("filter"), "stream");
      assert.strictEqual(requests[0]?.query.get("limit"), "25");
      assert.strictEqual(requests[1]?.query.get("after"), "25");
      assert.include(requests[0]?.query.get("fields") ?? "", "from{id,name}");
    }).pipe(Effect.scoped)
  );

  it.effect(
    "reads a reply by the Page as its own, and an author it is not shown as none",
    () =>
      Effect.gen(function* own() {
        const { account, graph, platform } = yield* onGraph();
        const { from: _from, ...anonymous } = comment(1);

        graph.add(anonymous);
        graph.add(comment(2, { from: page, parentId: "2001" }));

        const [reading] = (yield* platform.read(account, toRead)).readings;

        assert.deepStrictEqual(
          reading?._tag === "read"
            ? reading.comments.map(({ author, fromAccount, hidden }) => ({
                author,
                fromAccount,
                hidden,
              }))
            : [],
          [
            {
              author: Option.none(),
              fromAccount: false,
              hidden: Option.none(),
            },
            {
              author: Option.some({
                displayName: Option.some("Synthetic Page"),
                handle: "",
                platformId: facebookPageId,
              }),
              fromAccount: true,
              hidden: Option.none(),
            },
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "hands on a text with a NUL and half a surrogate pair as it came",
    () =>
      Effect.gen(function* hostile() {
        const { account, graph, platform } = yield* onGraph();
        const text = `Hi${String.fromCodePoint(0)}${String.fromCodePoint(0xd8_00)}`;

        graph.add(comment(1, { text }));

        const [reading] = (yield* platform.read(account, toRead)).readings;

        // The domain cleans what it keeps (storableReading); the reader
        // drops nothing.
        assert.strictEqual(
          reading?._tag === "read" ? reading.comments[0]?.text : "",
          text
        );
      }).pipe(Effect.scoped)
  );

  it.effect("halts at a rate limit, and finds a post gone", () =>
    Effect.gen(function* limited() {
      const { account, graph, platform } = yield* onGraph();

      graph.script.push(`GET /v27.0/${postId}/comments`, [
        metaError(80_001, 400, businessUsage(5)),
      ]);

      const halted = yield* platform.read(account, toRead);

      assert.isTrue(halted.halted);
      assert.lengthOf(halted.readings, 0);

      const gone = yield* platform.read(account, [
        {
          platformPostId: PlatformPostIdSchema.make("9999_1"),
          threadId: threadId(2),
        },
      ]);

      assert.strictEqual(gone.readings[0]?._tag, "missing");
    }).pipe(Effect.scoped)
  );

  it.effect("reads nothing of a Page that did not grant its comments", () =>
    Effect.gen(function* withheld() {
      const { account, graph, platform } = yield* onGraph({
        scopes: ["pages_show_list", "pages_manage_posts"],
      });

      const read = yield* platform.read(account, toRead).pipe(Effect.result);

      assert.isTrue(
        read._tag === "Failure" && read.failure._tag === "ChannelUnreadable"
      );
      assert.lengthOf(graph.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "pauses the channel, marking nothing, when a permission is missing",
    () =>
      Effect.gen(function* permission() {
        const { account, graph, platform } = yield* onGraph();

        graph.script.push(`GET /v27.0/${postId}/comments`, [
          metaError(200, 403),
        ]);

        const read = yield* platform.read(account, toRead).pipe(Effect.result);

        assert.isTrue(
          read._tag === "Failure" &&
            read.failure._tag === "ChannelUnreadable" &&
            read.failure.reason === "paused"
        );
      }).pipe(Effect.scoped)
  );

  it.effect("sends a reply in one request", () =>
    Effect.gen(function* sends() {
      const { account, graph, platform } = yield* onGraph();

      graph.add(comment(1));

      const outcome = yield* platform.send(account, outgoing);

      assert.strictEqual(outcome._tag, "sent");

      const made = graph.comments().at(-1);

      assert.deepStrictEqual(outcome, {
        _tag: "sent",
        permalink: Option.none(),
        platformCommentId: made?.id ?? "",
      });
      assert.strictEqual(made?.text, outgoing.text);
      assert.strictEqual(made?.parentId, "2001");
    }).pipe(Effect.scoped)
  );

  it.effect(
    "takes a lost answer as unconfirmed, then finds the reply on resume",
    () =>
      Effect.gen(function* lost() {
        const { account, graph, platform } = yield* onGraph();

        graph.add(comment(1));
        graph.loseAnswer("POST /v27.0/2001/comments");

        assert.deepStrictEqual(yield* platform.send(account, outgoing), {
          _tag: "unconfirmed",
          reason: "noResponse",
        });

        const made = graph.comments().at(-1);
        const before = graph.requests().length;
        const resumed = yield* platform.resume(account, outgoing);

        assert.deepStrictEqual(resumed, {
          _tag: "sent",
          permalink: Option.none(),
          platformCommentId: made?.id ?? "",
        });
        // Resuming only reads.
        assert.isTrue(
          graph
            .requests()
            .slice(before)
            .every(({ method }) => method === "GET")
        );
        assert.lengthOf(
          graph.comments().filter(({ text }) => text === outgoing.text),
          1
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "leaves a resumed reply to a person when two alike or none are found",
    () =>
      Effect.gen(function* undecided() {
        const { account, graph, platform } = yield* onGraph();
        const unknown = { _tag: "unconfirmed", reason: "interrupted" } as const;

        graph.add(comment(1));

        // None: never sent again.
        assert.deepStrictEqual(
          yield* platform.resume(account, outgoing),
          unknown
        );
        assert.isTrue(graph.requests().every(({ method }) => method === "GET"));

        // Two alike by the Page, since the reply was written.
        for (const n of [2, 3]) {
          graph.add(
            comment(n, {
              createdTime: "2026-11-10T09:20:10+0000",
              from: page,
              parentId: "2001",
              text: outgoing.text,
            })
          );
        }

        assert.deepStrictEqual(
          yield* platform.resume(account, outgoing),
          unknown
        );

        // One alike, written long before the reply: not it.
        const older = yield* onGraph();

        older.graph.add(comment(1));
        older.graph.add(
          comment(2, {
            createdTime: "2026-11-09T09:00:00+0000",
            from: page,
            parentId: "2001",
            text: outgoing.text,
          })
        );

        assert.deepStrictEqual(
          yield* older.platform.resume(older.account, outgoing),
          unknown
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "takes Meta failing on a reply as unconfirmed, and a refusal as a failure",
    () =>
      Effect.gen(function* failing() {
        const { account, graph, platform } = yield* onGraph();

        graph.add(comment(1));
        graph.script.push("POST /v27.0/2001/comments", [
          json(
            { error: { code: 2, is_transient: true, message: "synthetic" } },
            500
          ),
          dropped,
          metaError(80_001),
        ]);

        assert.strictEqual(
          (yield* platform.send(account, outgoing))._tag,
          "unconfirmed"
        );
        assert.strictEqual(
          (yield* platform.send(account, outgoing))._tag,
          "unconfirmed"
        );
        assert.deepStrictEqual(yield* platform.send(account, outgoing), {
          _tag: "failed",
          reason: "rateLimited",
        });
      }).pipe(Effect.scoped)
  );

  it.effect("hides, shows and withdraws, each safe to ask twice", () =>
    Effect.gen(function* acts() {
      const { account, graph, platform } = yield* onGraph();

      const target = {
        platformCommentId: "2001",
        receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
        rootPlatformPostId: postId,
      };

      graph.add(comment(1));
      graph.add(comment(2, { from: page, parentId: "2001" }));

      for (const _ of [1, 2]) {
        assert.deepStrictEqual(
          yield* platform.moderate(account, { ...target, action: "hide" }),
          { _tag: "done" }
        );
      }

      assert.isTrue(graph.comments()[0]?.hidden);
      assert.deepStrictEqual(graph.requests().at(-1)?.method, "POST");

      yield* platform.moderate(account, { ...target, action: "unhide" });
      assert.isFalse(graph.comments()[0]?.hidden);

      for (const _ of [1, 2]) {
        assert.deepStrictEqual(
          yield* platform.withdraw(account, "2002", postId),
          {
            _tag: "done",
          }
        );
      }

      assert.lengthOf(graph.comments(), 1);
      // Nobody likes or deletes another's comment from here yet.
      assert.deepStrictEqual(
        yield* platform.moderate(account, { ...target, action: "like" }),
        { _tag: "failed", reason: "refused" }
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "takes a comment Meta will not load as gone only while the post still loads",
    () =>
      Effect.gen(function* confirms() {
        const { account, graph, platform } = yield* onGraph();

        const gone = json(
          { error: { code: 100, error_subcode: 33, message: "synthetic" } },
          400
        );

        const target = {
          action: "hide" as const,
          platformCommentId: "2999",
          receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
          rootPlatformPostId: postId,
        };

        graph.add(comment(1));

        // The comment is gone and the post loads: done.
        assert.deepStrictEqual(
          yield* platform.withdraw(account, "2999", postId),
          { _tag: "done" }
        );
        assert.deepStrictEqual(yield* platform.moderate(account, target), {
          _tag: "done",
        });

        // The token loads neither: nobody can tell, nothing is done.
        graph.script.push(`GET /v27.0/${postId}`, [gone, gone]);

        assert.deepStrictEqual(
          yield* platform.withdraw(account, "2999", postId),
          { _tag: "failed", reason: "refused" }
        );
        assert.deepStrictEqual(yield* platform.moderate(account, target), {
          _tag: "failed",
          reason: "refused",
        });
      }).pipe(Effect.scoped)
  );

  it.effect("reads Meta's success in the answer before saying done", () =>
    Effect.gen(function* success() {
      const { account, graph, platform } = yield* onGraph();

      graph.add(comment(1));
      graph.add(comment(2, { from: page, parentId: "2001" }));
      graph.script.push("DELETE /v27.0/2002", [json({ success: false })]);

      assert.strictEqual(
        (yield* platform.withdraw(account, "2002", postId))._tag,
        "failed"
      );
      assert.lengthOf(graph.comments(), 2);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "pauses the channel rather than end a thread when the account itself no longer loads",
    () =>
      Effect.gen(function* unloadable() {
        const { account, graph, platform } = yield* onGraph();

        const gone = json(
          { error: { code: 100, error_subcode: 33, message: "synthetic" } },
          400
        );

        graph.add(comment(1));
        graph.script.push(
          `GET /v27.0/${postId}/comments`,
          [gone],
          `GET /v27.0/${facebookPageId}`,
          [gone]
        );

        const read = yield* platform.read(account, toRead).pipe(Effect.result);

        assert.isTrue(
          read._tag === "Failure" &&
            read.failure._tag === "ChannelUnreadable" &&
            read.failure.reason === "paused"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "fails only the thread a permission error is about, once another was read",
    () =>
      Effect.gen(function* oneThread() {
        const { account, graph, platform } = yield* onGraph();
        const second = `${facebookPageId}_1002`;

        graph.add(comment(1));
        graph.script.push(`GET /v27.0/${second}/comments`, [
          metaError(210, 400),
        ]);

        const batch = yield* platform.read(account, [
          ...toRead,
          {
            platformPostId: PlatformPostIdSchema.make(second),
            threadId: threadId(2),
          },
        ]);

        assert.isFalse(batch.halted);
        assert.deepStrictEqual(
          batch.readings.map(({ _tag }) => _tag),
          ["read", "failed"]
        );
      }).pipe(Effect.scoped)
  );
});
