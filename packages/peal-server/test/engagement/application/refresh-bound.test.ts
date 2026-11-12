import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Metric, Option } from "effect";
import { TestClock } from "effect/testing";

import { CollectComments } from "#engagement/application/collect-comments.ts";
import type {
  CommentsBatch,
  CommentsRequest,
} from "#engagement/application/ports/comment-source.ts";
import {
  forgetFailures,
  PurgeEngagement,
} from "#engagement/application/purge-engagement.ts";
import type { CommentReading } from "#engagement/domain/comment.ts";
import { writeReply } from "#engagement/domain/reply.ts";
import { endCollection } from "#engagement/domain/thread.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
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
    refreshWithin: Option.Option<Duration.Duration>,
    complete = true
  ) =>
  (request: CommentsRequest): Effect.Effect<CommentsBatch> =>
    Effect.succeed({
      halted: false,
      readings: request.threads.map(({ threadId }) => ({
        _tag: "read" as const,
        comments,
        complete,
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

  it.effect(
    "is moved by a complete read only: a comment an incomplete read did not return is forgotten at the bound",
    () => {
      const world = makeWorld();
      const day = Option.some(Duration.hours(24));

      world.state.posts.push(followedPost(1));
      world.state.read = showing([reading(1), reading(2)], day);

      return Effect.gen(function* incomplete() {
        yield* runAt(after("10 minutes"));

        const stamped = onlyThread(world).refreshBy;

        // Comments turned off, a cap, a deadline: a read that returns
        // only some of them, or none, never extends the bound.
        world.state.read = showing([reading(2)], day, false);
        yield* runAt(after("1 hour"));

        assert.deepStrictEqual(onlyThread(world).refreshBy, stamped);

        world.state.read = showing([], day, false);
        yield* runAt(after("2 hours"));

        assert.deepStrictEqual(onlyThread(world).refreshBy, stamped);
        assert.strictEqual(yield* forgetAt(after("1450 minutes")), 1);
        assert.isTrue(
          comments(world).every(
            ({ author, expired, text }) => !author && expired && text === ""
          )
        );
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("is first stamped by an incomplete read when none was", () => {
    const world = makeWorld();

    world.state.posts.push(followedPost(1));
    world.state.read = showing(
      [reading(1)],
      Option.some(Duration.hours(24)),
      false
    );

    return Effect.gen(function* first() {
      yield* runAt(after("10 minutes"));

      assert.deepStrictEqual(
        onlyThread(world).refreshBy,
        Option.some(
          after(Duration.sum(Duration.hours(24), Duration.minutes(10)))
        )
      );
    }).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "goes on past a thread it cannot forget, counts it, and still purges what is past its retention",
    () => {
      const world = makeWorld();
      world.state.posts.push(followedPost(1), followedPost(2));
      world.state.read = (request) =>
        Effect.succeed({
          halted: false,
          readings: request.threads.map(({ threadId }, index) => ({
            _tag: "read" as const,
            comments: [reading(10 + index)],
            complete: true,
            threadId,
          })),
          refreshWithin: Duration.hours(24),
        });

      return Effect.gen(function* failing() {
        yield* runAt(after("10 minutes"));

        const [failingThread] = [...world.state.threads.values()];

        assert.isDefined(failingThread);

        // The database refuses what the first thread's forgetting writes.
        world.state.saving = (saved) =>
          saved.some(({ threadId }) => threadId === failingThread.id)
            ? Effect.fail(new DatabaseError({ cause: "synthetic refusal" }))
            : Effect.void;

        const before = (yield* Metric.value(forgetFailures)).count;

        assert.strictEqual(yield* forgetAt(after("1450 minutes")), 1);
        assert.strictEqual(
          (yield* Metric.value(forgetFailures)).count,
          before + 1
        );

        const kept = [...world.state.comments.values()];

        assert.deepStrictEqual(
          kept.map(({ state, threadId }) => [
            threadId === failingThread.id,
            state,
          ]),
          [
            [true, "new"],
            [false, "deleted"],
          ]
        );

        // The daily purge still deletes what is past its retention.
        world.state.threads.set(
          failingThread.id,
          endCollection(failingThread, "window", after("1 day"))
        );

        yield* at(after("40 days"));

        assert.strictEqual(
          yield* PurgeEngagement.use((purging) => purging.purge),
          1
        );
        assert.isFalse(world.state.threads.has(failingThread.id));
      }).pipe(Effect.provide(world.layer));
    }
  );
});
