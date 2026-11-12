import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Option } from "effect";
import { TestClock } from "effect/testing";

import { CollectComments } from "#engagement/application/collect-comments.ts";
import type {
  CommentsBatch,
  CommentsRequest,
} from "#engagement/application/ports/comment-source.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
import type { CommentReading } from "#engagement/domain/comment.ts";
import { writeReply } from "#engagement/domain/reply.ts";
import { makeWorld } from "#test/engagement/fakes/world.ts";
import type { World } from "#test/engagement/fakes/world.ts";
import {
  followedPost,
  memberId,
  publishedAt,
  reading,
  replyId,
} from "#test/engagement/support.ts";

// A platform that bounds how long Peal keeps what it gave without reading
// it again: every read stamps its thread, and the retention forgets the
// comments of a thread no read reached in time, until a read finds them.

const after = (duration: Duration.Input) =>
  DateTime.addDuration(publishedAt, duration);

const at = (instant: DateTime.Utc) =>
  TestClock.setTime(DateTime.toEpochMillis(instant));

const runAt = (instant: DateTime.Utc) =>
  at(instant).pipe(
    Effect.andThen(CollectComments.use((collect) => collect.run(instant)))
  );

const forgetAt = (instant: DateTime.Utc) =>
  at(instant).pipe(
    Effect.andThen(PurgeEngagement.use((purging) => purging.forgetExpired))
  );

// A platform that shows these comments under every post, and bounds them.
const showing =
  (
    comments: readonly CommentReading[],
    refreshWithin: Option.Option<Duration.Duration>
  ) =>
  (request: CommentsRequest): Effect.Effect<CommentsBatch> =>
    Effect.succeed({
      halted: false,
      readings: request.threads.map(({ threadId }) => ({
        _tag: "read" as const,
        comments,
        complete: true,
        threadId,
      })),
      ...Option.match(refreshWithin, {
        onNone: () => ({}),
        onSome: (bound) => ({ refreshWithin: bound }),
      }),
    });

const onlyThread = (world: World) => {
  const [thread] = [...world.state.threads.values()];

  assert.isDefined(thread);

  return thread;
};

const comments = (world: World) =>
  [...world.state.comments.values()].map(
    ({ author, expiredAt, platformCommentId, state, text }) => ({
      author: Option.isSome(author),
      expired: Option.isSome(expiredAt),
      platformCommentId,
      state,
      text,
    })
  );

describe("the refresh bound", () => {
  it.effect("is stamped by each read, and moved by the next", () => {
    const world = makeWorld();

    world.state.posts.push(followedPost(1));
    world.state.read = showing([reading(1)], Option.some(Duration.hours(24)));

    return Effect.gen(function* stamping() {
      yield* runAt(after("10 minutes"));

      assert.deepStrictEqual(
        onlyThread(world).refreshBy,
        Option.some(
          after(Duration.sum(Duration.hours(24), Duration.minutes(10)))
        )
      );

      yield* runAt(after("20 minutes"));

      assert.deepStrictEqual(
        onlyThread(world).refreshBy,
        Option.some(
          after(Duration.sum(Duration.hours(24), Duration.minutes(20)))
        )
      );
    }).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "forgets a thread's comments once it passed, keeps their ids and the replies sent, and writes them back when read again",
    () => {
      const world = makeWorld();

      world.state.posts.push(followedPost(1));
      world.state.read = showing(
        [reading(1), reading(2)],
        Option.some(Duration.hours(24))
      );

      return Effect.gen(function* forgetting() {
        yield* runAt(after("10 minutes"));

        const [answered] = [...world.state.comments.values()];

        assert.isDefined(answered);

        const sent = writeReply(
          replyId(1),
          answered,
          Option.some(memberId),
          "Thank you, synthetic reader!",
          after("15 minutes")
        );

        world.state.replies.set(sent.id, sent);

        // A day after the read, less a moment: nothing yet.
        assert.strictEqual(yield* forgetAt(after("1449 minutes")), 0);
        assert.isTrue(comments(world).every(({ author }) => author));

        assert.strictEqual(yield* forgetAt(after("1450 minutes")), 1);
        assert.deepStrictEqual(comments(world), [
          {
            author: false,
            expired: true,
            platformCommentId: "2001",
            state: "deleted",
            text: "",
          },
          {
            author: false,
            expired: true,
            platformCommentId: "2002",
            state: "deleted",
            text: "",
          },
        ]);
        assert.deepStrictEqual(onlyThread(world).refreshBy, Option.none());
        assert.strictEqual(
          world.state.replies.get(replyId(1))?.text,
          "Thank you, synthetic reader!"
        );

        // Forgotten once: the next run finds nothing to do.
        assert.strictEqual(yield* forgetAt(after("1500 minutes")), 0);

        yield* runAt(after("26 hours"));

        assert.deepStrictEqual(
          comments(world).map(({ author, expired, state, text }) => ({
            author,
            expired,
            state,
            text,
          })),
          [
            { author: true, expired: false, state: "new", text: "Comment 1" },
            { author: true, expired: false, state: "new", text: "Comment 2" },
          ]
        );
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("leaves a thread of a platform that bounds nothing alone", () => {
    const world = makeWorld();

    world.state.posts.push(followedPost(1));
    world.state.read = showing([reading(1)], Option.none());

    return Effect.gen(function* untouched() {
      yield* runAt(after("10 minutes"));

      assert.deepStrictEqual(onlyThread(world).refreshBy, Option.none());
      assert.strictEqual(yield* forgetAt(after("400 days")), 0);
      assert.deepStrictEqual(
        comments(world).map(({ state, text }) => ({ state, text })),
        [{ state: "new", text: "Comment 1" }]
      );
    }).pipe(Effect.provide(world.layer));
  });
});
