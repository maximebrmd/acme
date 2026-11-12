import { assert, describe, it } from "@effect/vitest";
import {
  Cause,
  DateTime,
  Effect,
  Exit,
  Layer,
  Logger,
  Option,
  References,
  Result,
  Tracer,
} from "effect";
import { FetchHttpClient } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import type {
  CommentsBatch,
  ThreadToRead,
} from "#engagement/application/ports/comment-source.ts";
import type { OutgoingReply } from "#engagement/infrastructure/platforms/engagement-platform.ts";
import {
  youtubeCommentsDailyUnits,
  youtubeEngagement,
} from "#engagement/infrastructure/platforms/youtube/youtube-engagement.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { youtubeCommentScope } from "#shared/domain/inbox-platform.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  publicHttpClient,
  publicHttpClientWith,
} from "#shared/infrastructure/platforms/public-http.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import {
  fakeYouTubeComments,
  memoryQuota,
  youtubeChannelId,
  youtubeError,
} from "#test/engagement/fakes/fake-youtube-comments.ts";
import type {
  FakeYouTubeComment,
  FakeYouTubeCommentsOptions,
} from "#test/engagement/fakes/fake-youtube-comments.ts";
import { replyId, threadId } from "#test/engagement/support.ts";
import { dropped, json } from "#test/publishing/fakes/platform-server.ts";

// A YouTube channel's comments against a loopback API that answers as the
// YouTube Data API's references say: a video's threads with a few of
// their replies, the rest by comments.list, replies made, comments
// rejected and published again, the channel's own replies deleted.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000f3");

const granted = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  youtubeCommentScope,
];

const video = "vidSynthetic01";

const thread = (n: number, videoId = video): ThreadToRead => ({
  platformPostId: PlatformPostIdSchema.make(videoId),
  threadId: threadId(n),
});

const reader = "UCsyntheticReader0000001";

const outgoing = (changed: Partial<OutgoingReply> = {}): OutgoingReply => ({
  createdAt: DateTime.makeUnsafe("2026-11-10T09:20:00.000Z"),
  grandparentPlatformId: Option.none(),
  parentPlatformId: "Ugsynthetic1",
  replyId: replyId(1),
  rootPlatformPostId: video,
  takenIds: [],
  text: "Thank you, synthetic reader!",
  ...changed,
});

const comment = (
  n: number,
  changed: Partial<FakeYouTubeComment> = {}
): Omit<FakeYouTubeComment, "status"> => ({
  authorChannelId: reader,
  authorDisplayName: `@reader${String(n)}`,
  id: `Ugsynthetic${String(n)}`,
  publishedAt: `2026-11-10T09:${String(n % 60).padStart(2, "0")}:00Z`,
  text: `Comment ${String(n)}`,
  videoId: video,
  ...changed,
});

// The adapter on a fake API, as the channel, with a ledger of the day.
const onYouTube = Effect.fnUntraced(function* onYouTube(
  options: FakeYouTubeCommentsOptions & {
    readonly dailyUnits?: number;
    readonly maxBytes?: number;
    readonly scopes?: readonly string[];
    readonly tokens?: readonly string[];
  } = {}
) {
  const api = yield* fakeYouTubeComments(
    options.tokens ?? ["yt-token-1"],
    options
  );

  const quota = memoryQuota();

  const account: ChannelAccount = {
    accountId: youtubeChannelId,
    channelId,
    connection: Option.none(),
    platform: "youtube",
    scopes: options.scopes ?? granted,
  };

  const platform = yield* Effect.gen(function* building() {
    return yield* youtubeEngagement({
      api: new URL(api.url),
      dailyUnits: options.dailyUnits ?? youtubeCommentsDailyUnits,
      http: yield* publicHttpClient,
      reader: yield* publicHttpClientWith({
        maxResponseBytes: options.maxBytes ?? 8 * 1_048_576,
        overflow: "truncate",
        timeout: "20 seconds",
      }),
    });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        channelAccessOf(account, ["yt-token-1", "yt-token-2"]),
        FetchHttpClient.layer,
        OpenOutboundGuard,
        quota.layer
      )
    )
  );

  return { account, api, platform, quota };
});

const readingOf = (batch: CommentsBatch) => {
  const [first] = batch.readings;

  return first;
};

describe("YouTube's comments", () => {
  it.effect(
    "reads a thread, and the replies it came without, each under its top-level comment",
    () =>
      Effect.gen(function* replies() {
        const { account, api, platform } = yield* onYouTube({
          embeddedReplies: 2,
        });

        api.add(comment(1));
        api.add(comment(2));

        for (let n = 3; n <= 6; n += 1) {
          api.add(comment(n, { parentId: "Ugsynthetic1" }));
        }

        // The channel's own reply: the account's, never kept.
        api.add(
          comment(7, {
            authorChannelId: youtubeChannelId,
            authorDisplayName: "@pealexample",
            parentId: "Ugsynthetic2",
          })
        );

        const batch = yield* platform.read(account, [thread(1)]);
        const [reading] = batch.readings;

        assert.isFalse(batch.halted);
        assert.strictEqual(reading?._tag, "read");

        if (reading?._tag !== "read") {
          return;
        }

        assert.isTrue(reading.complete);
        assert.deepStrictEqual(
          reading.comments
            .map(({ fromAccount, parentPlatformId, platformCommentId }) => ({
              fromAccount,
              parent: Option.getOrNull(parentPlatformId),
              platformCommentId,
            }))
            .toSorted((left, right) =>
              left.platformCommentId.localeCompare(right.platformCommentId)
            ),
          [
            {
              fromAccount: false,
              parent: null,
              platformCommentId: "Ugsynthetic1",
            },
            {
              fromAccount: false,
              parent: null,
              platformCommentId: "Ugsynthetic2",
            },
            {
              fromAccount: false,
              parent: "Ugsynthetic1",
              platformCommentId: "Ugsynthetic3",
            },
            {
              fromAccount: false,
              parent: "Ugsynthetic1",
              platformCommentId: "Ugsynthetic4",
            },
            {
              fromAccount: false,
              parent: "Ugsynthetic1",
              platformCommentId: "Ugsynthetic5",
            },
            {
              fromAccount: false,
              parent: "Ugsynthetic1",
              platformCommentId: "Ugsynthetic6",
            },
            {
              fromAccount: true,
              parent: "Ugsynthetic2",
              platformCommentId: "Ugsynthetic7",
            },
          ]
        );

        const first = reading.comments.find(
          ({ platformCommentId }) => platformCommentId === "Ugsynthetic1"
        );

        assert.deepStrictEqual(
          first?.author,
          Option.some({
            displayName: Option.none(),
            handle: "reader1",
            platformId: reader,
          })
        );
        assert.strictEqual(first?.text, "Comment 1");
        assert.deepStrictEqual(first?.hidden, Option.some(false));
        assert.deepStrictEqual(first?.permalink, Option.none());

        // Plain text, newest first, the most a page holds.
        const [threads] = api.requests();

        assert.strictEqual(threads?.query.get("textFormat"), "plainText");
        assert.strictEqual(threads?.query.get("order"), "time");
        assert.strictEqual(threads?.query.get("maxResults"), "100");
        assert.strictEqual(threads?.query.get("part"), "snippet,replies");
      }).pipe(Effect.scoped)
  );

  it.effect("keeps no handle for a name that is not one", () =>
    Effect.gen(function* names() {
      const { account, api, platform } = yield* onYouTube();

      api.add(comment(1, { authorDisplayName: "Synthetic Reader" }));

      const reading = readingOf(yield* platform.read(account, [thread(1)]));

      assert.deepStrictEqual(
        reading?._tag === "read" ? reading.comments[0]?.author : undefined,
        Option.some({
          displayName: Option.some("Synthetic Reader"),
          handle: "",
          platformId: reader,
        })
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "reads a thread cut off at the client's bound as not all of it",
    () =>
      Effect.gen(function* truncated() {
        const { account, api, platform } = yield* onYouTube({ maxBytes: 4096 });

        for (let n = 1; n <= 40; n += 1) {
          api.add(comment(n));
        }

        const reading = readingOf(yield* platform.read(account, [thread(1)]));

        assert.strictEqual(reading?._tag, "read");

        if (reading?._tag === "read") {
          assert.isFalse(reading.complete);
          assert.isAbove(reading.comments.length, 0);
          assert.isBelow(reading.comments.length, 40);
        }
      }).pipe(Effect.scoped)
  );

  it.effect("calls nothing for a channel that did not grant the scope", () =>
    Effect.gen(function* withoutScope() {
      const { account, api, platform } = yield* onYouTube({
        scopes: granted.slice(0, 2),
      });

      const refused = yield* platform
        .read(account, [thread(1)])
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "ChannelUnreadable");
      assert.lengthOf(api.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.effect("renews a token YouTube refuses, and reads with the new one", () =>
    Effect.gen(function* renews() {
      const { account, api, platform } = yield* onYouTube({
        tokens: ["yt-token-2"],
      });

      api.add(comment(1));

      const reading = readingOf(yield* platform.read(account, [thread(1)]));

      assert.strictEqual(reading?._tag, "read");
      assert.lengthOf(api.requests(), 2);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "pauses the channel when the grant lacks the scope on the first thread, and fails only a later one",
    () =>
      Effect.gen(function* permission() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));
        api.addVideo("vidSynthetic02");
        api.script.push("GET /youtube/v3/commentThreads", [
          youtubeError(403, "insufficientPermissions"),
        ]);

        const paused = yield* platform
          .read(account, [thread(1)])
          .pipe(Effect.flip);

        assert.strictEqual(paused._tag, "ChannelUnreadable");

        api.script.push("GET /youtube/v3/commentThreads", [
          json({ items: [] }),
          youtubeError(403, "insufficientPermissions"),
        ]);

        const batch = yield* platform.read(account, [
          thread(1),
          thread(2, "vidSynthetic02"),
        ]);

        assert.deepStrictEqual(
          batch.readings.map(({ _tag }) => _tag),
          ["read", "failed"]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads a video whose comments are off as showing none, not as all of them",
    () =>
      Effect.gen(function* off() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));
        api.disable(video);

        const reading = readingOf(yield* platform.read(account, [thread(1)]));

        assert.deepStrictEqual(reading, {
          _tag: "read",
          comments: [],
          complete: false,
          threadId: threadId(1),
        });
      }).pipe(Effect.scoped)
  );

  it.effect(
    "fails, never ends, a thread whose listing answers 404 for another reason",
    () =>
      Effect.gen(function* otherNotFound() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));
        api.script.push("GET /youtube/v3/commentThreads", [
          json({ error: "synthetic" }, 404),
          youtubeError(404, "commentThreadNotFound"),
        ]);

        for (let attempt = 0; attempt < 2; attempt += 1) {
          assert.deepStrictEqual(
            readingOf(yield* platform.read(account, [thread(1)])),
            { _tag: "failed", threadId: threadId(1) }
          );
        }
      }).pipe(Effect.scoped)
  );

  it.effect("ends a thread whose video is gone", () =>
    Effect.gen(function* gone() {
      const { account, platform } = yield* onYouTube();

      const reading = readingOf(yield* platform.read(account, [thread(1)]));

      assert.deepStrictEqual(reading, {
        _tag: "missing",
        threadId: threadId(1),
      });
    }).pipe(Effect.scoped)
  );

  it.effect(
    "halts for the day once YouTube says the project's quota is spent, and calls nothing more",
    () =>
      Effect.gen(function* quota() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));
        api.script.push("GET /youtube/v3/commentThreads", [
          youtubeError(403, "quotaExceeded"),
        ]);

        const halted = yield* platform.read(account, [thread(1)]);

        assert.deepStrictEqual(halted, { halted: true, readings: [] });

        const later = yield* platform.read(account, [thread(1)]);

        assert.isTrue(later.halted);
        assert.lengthOf(api.requests(), 1);
      }).pipe(Effect.scoped)
  );

  it.effect("halts when YouTube asks to slow down, keeping what it read", () =>
    Effect.gen(function* slowDown() {
      const { account, api, platform } = yield* onYouTube();

      api.add(comment(1));
      api.addVideo("vidSynthetic02");
      api.script.push("GET /youtube/v3/commentThreads", [
        json({ items: [] }),
        youtubeError(429, "rateLimitExceeded"),
      ]);

      const batch = yield* platform.read(account, [
        thread(1),
        thread(2, "vidSynthetic02"),
      ]);

      assert.isTrue(batch.halted);
      assert.deepStrictEqual(
        batch.readings.map(({ _tag }) => _tag),
        ["read"]
      );
    }).pipe(Effect.scoped)
  );

  it.effect("waits when YouTube fails before anything was read", () =>
    Effect.gen(function* down() {
      const { account, api, platform } = yield* onYouTube();

      api.script.push("GET /youtube/v3/commentThreads", [
        json({ error: { code: 503, message: "synthetic" } }, 503),
      ]);

      const failed = yield* platform
        .read(account, [thread(1)])
        .pipe(Effect.flip);

      assert.strictEqual(failed._tag, "PlatformUnavailable");
    }).pipe(Effect.scoped)
  );

  it.effect("reads no more than the server's day of comment reads allows", () =>
    Effect.gen(function* budget() {
      const { account, api, platform, quota } = yield* onYouTube({
        dailyUnits: 2,
      });

      api.add(comment(1));
      api.addVideo("vidSynthetic02");
      api.addVideo("vidSynthetic03");

      const batch = yield* platform.read(account, [
        thread(1),
        thread(2, "vidSynthetic02"),
        thread(3, "vidSynthetic03"),
      ]);

      assert.isTrue(batch.halted);
      assert.lengthOf(batch.readings, 2);
      assert.lengthOf(api.requests(), 2);
      assert.deepStrictEqual([...quota.spent.values()], [2]);
    }).pipe(Effect.scoped)
  );
});

describe("YouTube's replies", () => {
  it.effect(
    "answers under the top-level comment, a reply to a reply included",
    () =>
      Effect.gen(function* sends() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));
        api.add(comment(2, { parentId: "Ugsynthetic1" }));

        const sent = yield* platform.send(
          account,
          outgoing({
            grandparentPlatformId: Option.some("Ugsynthetic1"),
            parentPlatformId: "Ugsynthetic2",
          })
        );

        assert.strictEqual(sent._tag, "sent");
        assert.strictEqual(
          sent._tag === "sent"
            ? api.comment(sent.platformCommentId)?.parentId
            : undefined,
          "Ugsynthetic1"
        );
      }).pipe(Effect.scoped)
  );

  it.effect("says a reply whose answer never came may be out", () =>
    Effect.gen(function* lost() {
      const { account, api, platform } = yield* onYouTube();

      api.add(comment(1));
      api.lose("POST /youtube/v3/comments");

      assert.deepStrictEqual(yield* platform.send(account, outgoing()), {
        _tag: "unconfirmed",
        reason: "noResponse",
      });

      api.script.push("POST /youtube/v3/comments", [
        json({ error: { code: 500, message: "synthetic" } }, 500),
      ]);

      assert.deepStrictEqual(yield* platform.send(account, outgoing()), {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
    }).pipe(Effect.scoped)
  );

  it.effect("fails a reply YouTube refuses, which nothing made", () =>
    Effect.gen(function* refused() {
      const { account, api, platform } = yield* onYouTube();

      api.add(comment(1));
      api.script.push("POST /youtube/v3/comments", [
        youtubeError(400, "commentTextTooLong"),
        youtubeError(403, "quotaExceeded"),
      ]);

      assert.deepStrictEqual(yield* platform.send(account, outgoing()), {
        _tag: "failed",
        reason: "tooLong",
      });
      assert.deepStrictEqual(yield* platform.send(account, outgoing()), {
        _tag: "failed",
        reason: "rateLimited",
      });
      assert.deepStrictEqual(
        yield* platform.send(
          account,
          outgoing({ parentPlatformId: "Ugsynthetic404" })
        ),
        { _tag: "failed", reason: "commentGone" }
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "finds a resumed reply once among the replies, and never sends it",
    () =>
      Effect.gen(function* resumes() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));
        api.lose("POST /youtube/v3/comments");

        yield* platform.send(account, outgoing());

        const resumed = yield* platform.resume(account, outgoing());

        const posts = api
          .requests()
          .filter(({ method }) => method === "POST").length;

        assert.strictEqual(resumed._tag, "sent");
        assert.strictEqual(posts, 1);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "leaves a resumed reply to a person when none or two are found",
    () =>
      Effect.gen(function* undecided() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));

        assert.deepStrictEqual(yield* platform.resume(account, outgoing()), {
          _tag: "unconfirmed",
          reason: "interrupted",
        });

        for (const n of [8, 9]) {
          api.add(
            comment(n, {
              authorChannelId: youtubeChannelId,
              parentId: "Ugsynthetic1",
              publishedAt: "2026-11-10T09:21:00Z",
              text: "Thank you, synthetic reader!",
            })
          );
        }

        assert.deepStrictEqual(yield* platform.resume(account, outgoing()), {
          _tag: "unconfirmed",
          reason: "interrupted",
        });
        assert.isFalse(api.requests().some(({ method }) => method === "POST"));
      }).pipe(Effect.scoped)
  );

  it.effect("does not take another reply's id for the one resumed", () =>
    Effect.gen(function* taken() {
      const { account, api, platform } = yield* onYouTube();

      api.add(comment(1));
      api.add(
        comment(8, {
          authorChannelId: youtubeChannelId,
          parentId: "Ugsynthetic1",
          publishedAt: "2026-11-10T09:21:00Z",
          text: "Thank you, synthetic reader!",
        })
      );

      assert.deepStrictEqual(
        yield* platform.resume(
          account,
          outgoing({ takenIds: ["Ugsynthetic8"] })
        ),
        { _tag: "unconfirmed", reason: "interrupted" }
      );
    }).pipe(Effect.scoped)
  );
});

describe("YouTube's moderation", () => {
  it.effect(
    "hides a comment by rejecting it, and shows it by publishing it",
    () =>
      Effect.gen(function* hides() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));

        const target = {
          platformCommentId: "Ugsynthetic1",
          receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
          rootPlatformPostId: video,
        };

        assert.deepStrictEqual(
          yield* platform.moderate(account, { ...target, action: "hide" }),
          { _tag: "done" }
        );
        assert.strictEqual(api.comment("Ugsynthetic1")?.status, "rejected");
        assert.deepStrictEqual(
          yield* platform.moderate(account, { ...target, action: "unhide" }),
          { _tag: "done" }
        );
        assert.strictEqual(api.comment("Ugsynthetic1")?.status, "published");
        assert.isFalse(
          api.requests().some(({ query }) => query.has("banAuthor"))
        );
        // Neither a like nor deleting someone's comment.
        assert.deepStrictEqual(
          yield* platform.moderate(account, { ...target, action: "like" }),
          { _tag: "failed", reason: "refused" }
        );
      }).pipe(Effect.scoped)
  );

  it.effect("refuses to show again a comment YouTube will not publish", () =>
    Effect.gen(function* refusesToShow() {
      const { account, api, platform } = yield* onYouTube();

      api.add(comment(1));
      api.script.push("POST /youtube/v3/comments/setModerationStatus", [
        youtubeError(400, "processingFailure"),
      ]);

      assert.deepStrictEqual(
        yield* platform.moderate(account, {
          action: "unhide",
          platformCommentId: "Ugsynthetic1",
          receivedAt: DateTime.makeUnsafe("2026-11-10T09:10:00.000Z"),
          rootPlatformPostId: video,
        }),
        { _tag: "failed", reason: "refused" }
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "withdraws the channel's own reply, one already gone included",
    () =>
      Effect.gen(function* withdraws() {
        const { account, api, platform } = yield* onYouTube();

        api.add(comment(1));
        api.add(
          comment(8, {
            authorChannelId: youtubeChannelId,
            parentId: "Ugsynthetic1",
          })
        );

        assert.deepStrictEqual(
          yield* platform.withdraw(account, "Ugsynthetic8", video),
          { _tag: "done" }
        );
        assert.isUndefined(api.comment("Ugsynthetic8"));
        assert.deepStrictEqual(
          yield* platform.withdraw(account, "Ugsynthetic8", video),
          { _tag: "done" }
        );
        // Someone else's is not the channel's to delete.
        assert.deepStrictEqual(
          yield* platform.withdraw(account, "Ugsynthetic1", video),
          { _tag: "failed", reason: "refused" }
        );
      }).pipe(Effect.scoped)
  );

  it.effect("says a withdrawal whose answer never came was not done", () =>
    Effect.gen(function* lostWithdrawal() {
      const { account, api, platform } = yield* onYouTube();

      api.script.push("DELETE /youtube/v3/comments", [dropped]);

      const outcome = yield* platform
        .withdraw(account, "Ugsynthetic8", video)
        .pipe(Effect.result);

      assert.deepStrictEqual(
        outcome,
        Result.succeed({ _tag: "failed", reason: "platformUnavailable" })
      );
    }).pipe(Effect.scoped)
  );
});

describe("what YouTube's adapter writes", () => {
  it.effect(
    "holds no comment's text, no author and no reply's text in a log or a span",
    () => {
      const lines: string[] = [];
      const spans: Tracer.NativeSpan[] = [];

      const capture = Logger.layer([
        Logger.make(({ cause, fiber, message }) => {
          lines.push(
            JSON.stringify(message),
            Cause.pretty(cause),
            JSON.stringify(fiber.getRef(References.CurrentLogAnnotations))
          );
        }),
      ]);

      const tracer = Tracer.make({
        span: (options) => {
          const span = new Tracer.NativeSpan(options);

          spans.push(span);

          return span;
        },
      });

      return Effect.gen(function* searched() {
        const { account, api, platform } = yield* onYouTube();

        api.add(
          comment(1, {
            authorChannelId: "UCzxqAuthor0000000000001",
            authorDisplayName: "@zxq-handle",
            text: "zxq-comment-words someone outside wrote",
          })
        );
        api.script.push("GET /youtube/v3/comments", [
          youtubeError(403, "quotaExceeded"),
        ]);

        yield* platform.read(account, [thread(1)]);
        yield* platform.send(
          account,
          outgoing({ text: "zxq-reply-words a member wrote back" })
        );
        yield* platform.resume(
          account,
          outgoing({ text: "zxq-reply-words a member wrote back" })
        );

        const all = [
          ...lines,
          ...spans.map((span) =>
            [
              span.name,
              JSON.stringify([...span.attributes]),
              JSON.stringify(span.events),
              span.status._tag === "Ended" && Exit.isFailure(span.status.exit)
                ? Cause.pretty(span.status.exit.cause)
                : "",
            ].join("\n")
          ),
        ].join("\n");

        assert.isAbove(spans.length, 3);
        assert.notInclude(all, "zxq");
      }).pipe(
        Effect.scoped,
        Effect.provide(
          Layer.merge(capture, Layer.succeed(Tracer.Tracer, tracer))
        )
      );
    }
  );
});
