import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { instagramEngagement } from "#engagement/infrastructure/platforms/meta/instagram-engagement.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { fakeMetaComments } from "#test/engagement/fakes/fake-meta-comments.ts";
import type {
  FakeComment,
  FakeMetaCommentsOptions,
} from "#test/engagement/fakes/fake-meta-comments.ts";
import { replyId, threadId } from "#test/engagement/support.ts";
import {
  graphAppSecret,
  instagramUserId,
  metaError,
} from "#test/publishing/fakes/fake-meta-graph.ts";

// An Instagram account's comments against a loopback Graph that answers as
// Meta's references say: a media's top-level comments with their replies,
// a comment's further replies, replies made, hidden and deleted, through a
// Page (with the proof) or through Instagram Login (without).

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000f3");

const mediaId = "17900000000001001";

const reader = { id: "1780000000000001", name: "synthetic.reader" };

const studio = { id: instagramUserId, name: "synthetic_studio" };

const toRead = [
  { platformPostId: PlatformPostIdSchema.make(mediaId), threadId: threadId(1) },
];

const outgoing = {
  createdAt: DateTime.makeUnsafe("2026-11-10T09:20:00.000Z"),
  parentPlatformId: "ig2001",
  replyId: replyId(1),
  rootPlatformPostId: mediaId,
  text: "Thank you, synthetic reader!",
};

type Added = Omit<FakeComment, "hidden"> & { hidden?: boolean };

const comment = (n: number, changed: Partial<Added> = {}): Added => ({
  createdTime: `2026-11-10T09:0${String(n % 10)}:00+0000`,
  from: reader,
  id: `ig${String(2000 + n)}`,
  objectId: mediaId,
  text: `Comment ${String(n)}`,
  ...changed,
});

// The adapter on a fake Graph, as the account, through `connection`.
const onGraph = Effect.fnUntraced(function* onGraph(
  options: FakeMetaCommentsOptions & {
    readonly scopes?: readonly string[];
  } = {}
) {
  const graph = yield* fakeMetaComments(["ig-token-1"], options);
  const url = new URL(graph.url);
  const instagramLogin = options.instagramLogin === true;

  const account: ChannelAccount = {
    accountId: instagramUserId,
    channelId,
    connection: Option.some(
      instagramLogin ? "instagramLogin" : "facebookLogin"
    ),
    platform: "instagram",
    scopes:
      options.scopes ??
      (instagramLogin
        ? ["instagram_business_basic", "instagram_business_manage_comments"]
        : ["instagram_basic", "instagram_manage_comments"]),
  };

  const platform = yield* Effect.gen(function* building() {
    return yield* instagramEngagement({
      appSecret: Option.some(Redacted.make(graphAppSecret)),
      hosts: { ...metaHosts, facebookGraph: url, instagramGraph: url },
      http: yield* publicHttpClient,
    });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        channelAccessOf(account, ["ig-token-1"]),
        FetchHttpClient.layer,
        OpenOutboundGuard,
        Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
      )
    )
  );

  return { account, graph, platform };
});

const unknown = { _tag: "unconfirmed", reason: "interrupted" } as const;

describe("Instagram's comments", () => {
  it.effect(
    "reads a thread across pages, each comment with all its replies",
    () =>
      Effect.gen(function* across() {
        const { account, graph, platform } = yield* onGraph({
          embeddedReplies: 2,
        });

        for (let n = 1; n <= 27; n += 1) {
          graph.add(comment(n));
        }

        for (let n = 30; n <= 34; n += 1) {
          graph.add(comment(n, { parentId: "ig2001" }));
        }

        graph.add(comment(40, { from: studio, parentId: "ig2002" }));

        const batch = yield* platform.read(account, toRead);
        const [reading] = batch.readings;

        assert.isFalse(batch.halted);
        assert.strictEqual(reading?._tag, "read");

        if (reading?._tag !== "read") {
          return;
        }

        assert.isTrue(reading.complete);
        assert.lengthOf(reading.comments, 33);

        const own = reading.comments.find(
          ({ platformCommentId }) => platformCommentId === "ig2040"
        );

        assert.isTrue(own?.fromAccount);
        assert.deepStrictEqual(own?.parentPlatformId, Option.some("ig2002"));
        assert.deepStrictEqual(
          reading.comments[0]?.author,
          Option.some({
            displayName: Option.none(),
            handle: "synthetic.reader",
            platformId: reader.id,
          })
        );
        assert.deepStrictEqual(reading.comments[0]?.hidden, Option.some(false));

        // Two pages of comments, and the further replies of the first.
        const paths = graph.requests().map(({ path }) => path);

        assert.deepStrictEqual(paths, [
          `/v27.0/${mediaId}/comments`,
          "/v27.0/ig2001/replies",
          `/v27.0/${mediaId}/comments`,
        ]);
      }).pipe(Effect.scoped)
  );

  it.effect("reads through Instagram Login without a proof", () =>
    Effect.gen(function* login() {
      const { account, graph, platform } = yield* onGraph({
        instagramLogin: true,
      });

      graph.add(comment(1, { hidden: true }));

      const [reading] = (yield* platform.read(account, toRead)).readings;

      assert.strictEqual(reading?._tag, "read");
      assert.deepStrictEqual(
        reading?._tag === "read" ? reading.comments[0]?.hidden : undefined,
        Option.some(true)
      );
      assert.isFalse(graph.requests()[0]?.query.has("appsecret_proof"));
    }).pipe(Effect.scoped)
  );

  it.effect(
    "keeps an author it is not shown as none, and halts at a rate limit",
    () =>
      Effect.gen(function* missing() {
        const { account, graph, platform } = yield* onGraph();
        const { from: _from, ...anonymous } = comment(1);

        graph.add(anonymous);

        const [reading] = (yield* platform.read(account, toRead)).readings;

        assert.deepStrictEqual(
          reading?._tag === "read" ? reading.comments[0]?.author : undefined,
          Option.none()
        );

        graph.script.push(`GET /v27.0/${mediaId}/comments`, [metaError(4)]);

        const halted = yield* platform.read(account, toRead);

        assert.isTrue(halted.halted);
      }).pipe(Effect.scoped)
  );

  it.effect("sends a reply, then finds one whose answer was lost", () =>
    Effect.gen(function* sends() {
      const { account, graph, platform } = yield* onGraph();

      graph.add(comment(1));

      assert.strictEqual(
        (yield* platform.send(account, outgoing))._tag,
        "sent"
      );

      const second = yield* onGraph();

      second.graph.add(comment(1));
      second.graph.loseAnswer("POST /v27.0/ig2001/replies");

      assert.deepStrictEqual(
        yield* second.platform.send(second.account, outgoing),
        { _tag: "unconfirmed", reason: "noResponse" }
      );

      const made = second.graph.comments().at(-1);

      assert.deepStrictEqual(
        yield* second.platform.resume(second.account, outgoing),
        {
          _tag: "sent",
          permalink: Option.none(),
          platformCommentId: made?.id ?? "",
        }
      );
      assert.lengthOf(
        second.graph.comments().filter(({ text }) => text === outgoing.text),
        1
      );
    }).pipe(Effect.scoped)
  );

  it.effect("never sends a resumed reply it finds twice, or not at all", () =>
    Effect.gen(function* undecided() {
      const { account, graph, platform } = yield* onGraph();

      graph.add(comment(1));

      assert.deepStrictEqual(
        yield* platform.resume(account, outgoing),
        unknown
      );

      for (const n of [2, 3]) {
        graph.add(
          comment(n, {
            createdTime: "2026-11-10T09:20:10+0000",
            from: studio,
            parentId: "ig2001",
            text: outgoing.text,
          })
        );
      }

      assert.deepStrictEqual(
        yield* platform.resume(account, outgoing),
        unknown
      );
      assert.isTrue(graph.requests().every(({ method }) => method === "GET"));
    }).pipe(Effect.scoped)
  );

  it.effect("hides, shows and withdraws, each safe to ask twice", () =>
    Effect.gen(function* acts() {
      const { account, graph, platform } = yield* onGraph();

      const target = {
        platformCommentId: "ig2001",
        receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
        rootPlatformPostId: mediaId,
      };

      graph.add(comment(1));
      graph.add(comment(2, { from: studio, parentId: "ig2001" }));

      for (const _ of [1, 2]) {
        assert.deepStrictEqual(
          yield* platform.moderate(account, { ...target, action: "hide" }),
          { _tag: "done" }
        );
      }

      assert.isTrue(graph.comments()[0]?.hidden);
      assert.strictEqual(graph.requests().at(-1)?.method, "POST");

      yield* platform.moderate(account, { ...target, action: "unhide" });
      assert.isFalse(graph.comments()[0]?.hidden);

      for (const _ of [1, 2]) {
        assert.deepStrictEqual(yield* platform.withdraw(account, "ig2002"), {
          _tag: "done",
        });
      }

      assert.lengthOf(graph.comments(), 1);
    }).pipe(Effect.scoped)
  );
});
