import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Option } from "effect";
import { TestClock } from "effect/testing";

import { toThreadDetailView } from "#engagement/api/inbox-view.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { CollectComments } from "#engagement/application/collect-comments.ts";
import { EngagementInbox } from "#engagement/application/engagement-inbox.ts";
import type {
  CommentsBatch,
  CommentsRequest,
} from "#engagement/application/ports/comment-source.ts";
import type { CommentReading } from "#engagement/domain/comment.ts";
import { recordCollection } from "#engagement/domain/thread.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Actor } from "#shared/domain/access.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { makeWorld } from "#test/engagement/fakes/world.ts";
import type { World } from "#test/engagement/fakes/world.ts";
import {
  channelId,
  followedPost,
  memberId,
  publishedAt,
  reading,
  workspaceId,
} from "#test/engagement/support.ts";

const reader = new Actor({
  permissions: ["engagement:read"],
  subject: { _tag: "user", impersonatedBy: Option.none(), userId: memberId },
  workspaceId,
});

const after = (duration: Duration.Input) =>
  DateTime.addDuration(publishedAt, duration);

// Runs the collection scheduled at `at`, on a clock set to it.
const runAt = (at: DateTime.Utc) =>
  TestClock.setTime(DateTime.toEpochMillis(at)).pipe(
    Effect.andThen(CollectComments.use((collect) => collect.run(at)))
  );

// A platform that shows these comments under every post.
const showing =
  (comments: readonly CommentReading[], complete = true) =>
  (request: CommentsRequest): Effect.Effect<CommentsBatch> =>
    Effect.succeed({
      halted: false,
      readings: request.threads.map(({ threadId }) => ({
        _tag: "read" as const,
        comments,
        complete,
        threadId,
      })),
    });

const commentsOf = (world: World) => [...world.state.comments.values()];

const onlyThread = (world: World) => {
  const [thread] = [...world.state.threads.values()];

  assert.isDefined(thread);

  return thread;
};

// A later part of a post, as its platform shows it under the first: the
// account's own reply to the part before.
const part = (id: string, parent: Option.Option<string>): CommentReading =>
  reading(9, {
    fromAccount: true,
    parentPlatformId: parent,
    platformCommentId: id,
    text: `Part ${id}`,
  });

describe(CollectComments, () => {
  it.effect("follows the posts that went live and reads their comments", () => {
    const world = makeWorld();

    world.state.posts.push(followedPost(1));
    world.state.read = showing([reading(1), reading(2)]);

    return Effect.gen(function* collecting() {
      const report = yield* runAt(after("10 minutes"));

      assert.deepStrictEqual(report, {
        discovered: 1,
        ended: 0,
        failed: 0,
        left: 0,
        postponed: 0,
        read: 1,
        received: 2,
      });

      assert.deepStrictEqual(
        commentsOf(world).map(({ state, text }) => ({ state, text })),
        [
          { state: "new", text: "Comment 1" },
          { state: "new", text: "Comment 2" },
        ]
      );

      // The thread is read again on the next run, in its first day.
      assert.deepStrictEqual(onlyThread(world).collection, {
        _tag: "collecting",
        nextAt: after("20 minutes"),
      });
    }).pipe(Effect.provide(world.layer));
  });

  it.effect("tells the workspace of new comments once, with the fact", () => {
    const world = makeWorld();

    world.state.posts.push(followedPost(1));
    world.state.read = showing([reading(1)]);

    return Effect.gen(function* collecting() {
      yield* runAt(after("10 minutes"));
      yield* runAt(after("20 minutes"));

      assert.lengthOf(world.state.received, 1);
      assert.deepStrictEqual(
        world.state.received[0]?.comments.map(({ text }) => text),
        ["Comment 1"]
      );

      world.state.read = showing([reading(1), reading(2)]);

      yield* runAt(after("30 minutes"));

      assert.deepStrictEqual(
        world.state.received[1]?.comments.map(({ text }) => text),
        ["Comment 2"]
      );
    }).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "keeps a comment once however often it is read, and follows its edits",
    () => {
      const world = makeWorld();

      world.state.posts.push(followedPost(1));
      world.state.read = showing([reading(1)]);

      return Effect.gen(function* collecting() {
        yield* runAt(after("10 minutes"));

        const [first] = commentsOf(world);

        world.state.read = showing([reading(1, { text: "Edited" })]);

        yield* runAt(after("20 minutes"));

        const [again] = commentsOf(world);

        assert.lengthOf(commentsOf(world), 1);
        assert.strictEqual(again?.id, first?.id);
        assert.strictEqual(again?.text, "Edited");
        assert.deepStrictEqual(again?.receivedAt, first?.receivedAt);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "forgets the text and the author of a comment its platform no longer shows",
    () => {
      const world = makeWorld();

      world.state.posts.push(followedPost(1));
      world.state.read = showing([reading(1), reading(2)]);

      return Effect.gen(function* collecting() {
        yield* runAt(after("10 minutes"));

        world.state.read = showing([reading(2)]);

        yield* runAt(after("20 minutes"));

        const gone = commentsOf(world).find(
          ({ platformCommentId }) => platformCommentId === "2001"
        );

        assert.strictEqual(gone?.state, "deleted");
        assert.strictEqual(gone?.text, "");
        assert.deepStrictEqual(gone?.author, Option.none());
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "deletes nothing after a read that could not see every comment",
    () => {
      const world = makeWorld();

      world.state.posts.push(followedPost(1));
      world.state.read = showing([reading(1), reading(2)]);

      return Effect.gen(function* collecting() {
        yield* runAt(after("10 minutes"));

        world.state.read = showing([reading(2)], false);

        yield* runAt(after("20 minutes"));

        assert.deepStrictEqual(
          commentsOf(world).map(({ state }) => state),
          ["new", "new"]
        );
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "keeps reading the other threads when one cannot be saved or breaks, and puts that one behind them",
    () => {
      const world = makeWorld();
      const unsavable = followedPost(1);
      const breaking = followedPost(2);
      const fine = followedPost(3);

      world.state.posts.push(unsavable, breaking, fine);
      world.state.read = showing([reading(1)]);

      // The database refuses what one thread holds, and a fault of Peal's
      // own breaks on another.
      world.state.saving = (comments) => {
        const [first] = comments;
        const thread = world.state.threads.get(first?.threadId ?? "");

        if (thread?.targetId === unsavable.targetId) {
          return Effect.fail(new DatabaseError({ cause: "synthetic" }));
        }

        return thread?.targetId === breaking.targetId
          ? Effect.die(new Error("synthetic fault"))
          : Effect.void;
      };

      return Effect.gen(function* collecting() {
        const at = after("10 minutes");
        const report = yield* runAt(at);

        assert.deepInclude(report, { failed: 2, read: 1, received: 1 });

        const byTarget = new Map(
          [...world.state.threads.values()].map((thread) => [
            thread.targetId,
            thread,
          ])
        );

        // The thread that was read follows its schedule; the two others
        // wait half an hour, away from the queue's front.
        assert.deepStrictEqual(
          commentsOf(world).map(({ threadId }) => threadId),
          [byTarget.get(fine.targetId)?.id]
        );

        for (const failed of [unsavable, breaking]) {
          assert.deepStrictEqual(byTarget.get(failed.targetId)?.collection, {
            _tag: "collecting",
            nextAt: DateTime.addDuration(at, "30 minutes"),
          });
        }

        // The next run does not meet them again, and goes on.
        const next = yield* runAt(after("20 minutes"));

        assert.deepInclude(next, { failed: 0, read: 1 });
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "takes no part of a thread for a comment, and keeps the comments under every part",
    () => {
      const world = makeWorld();

      // A post of three parts, as its platform shows it under its first.
      world.state.posts.push(followedPost(1));
      world.state.read = showing([
        reading(1),
        part("1002", Option.none()),
        reading(2, { parentPlatformId: Option.some("1002") }),
        part("1003", Option.some("1002")),
        reading(3, { parentPlatformId: Option.some("1003") }),
      ]);

      return Effect.gen(function* collecting() {
        const inbox = yield* EngagementInbox;

        yield* runAt(after("10 minutes"));

        // Three comments, none of them a part, and none answered by one.
        assert.deepStrictEqual(
          commentsOf(world).map(({ platformCommentId, state }) => [
            platformCommentId,
            state,
          ]),
          [
            ["2001", "new"],
            ["2002", "new"],
            ["2003", "new"],
          ]
        );
        assert.deepStrictEqual(
          world.state.received.map(({ comments }) => comments.length),
          [3]
        );

        // A comment under a later part answers the post, like one under
        // the first: its parent is no comment.
        const detail = yield* inbox.thread(reader, onlyThread(world).id);

        assert.deepStrictEqual(
          toThreadDetailView(detail).comments.map(({ parentId }) => parentId),
          [null, null, null]
        );
        assert.strictEqual(detail.summary.unanswered, 3);

        // Read again, nothing changes: no part answers anything later.
        yield* runAt(after("20 minutes"));

        assert.deepStrictEqual(
          commentsOf(world).map(({ state }) => state),
          ["new", "new", "new"]
        );
        assert.lengthOf(world.state.received, 1);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "takes the account's own reply on the platform as an answer, and keeps none of it",
    () => {
      const world = makeWorld();

      world.state.posts.push(followedPost(1));
      world.state.read = showing([
        reading(1),
        reading(2, {
          fromAccount: true,
          parentPlatformId: Option.some("2001"),
          text: "Thanks!",
        }),
      ]);

      return Effect.gen(function* collecting() {
        const report = yield* runAt(after("10 minutes"));

        assert.lengthOf(commentsOf(world), 1);
        assert.strictEqual(commentsOf(world)[0]?.state, "answered");
        // Already answered when Peal first read it: nobody is told.
        assert.strictEqual(report.received, 0);
        assert.lengthOf(world.state.received, 0);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "forgets every comment of a post its platform no longer shows, and reads it no more",
    () => {
      const world = makeWorld();

      world.state.posts.push(followedPost(1));
      world.state.read = showing([reading(1)]);

      return Effect.gen(function* collecting() {
        yield* runAt(after("10 minutes"));

        world.state.read = (request) =>
          Effect.succeed({
            halted: false,
            readings: request.threads.map(({ threadId }) => ({
              _tag: "missing" as const,
              threadId,
            })),
          });

        const report = yield* runAt(after("20 minutes"));

        assert.strictEqual(report.ended, 1);
        assert.strictEqual(commentsOf(world)[0]?.state, "deleted");
        assert.strictEqual(commentsOf(world)[0]?.text, "");
        assert.deepStrictEqual(onlyThread(world).collection, {
          _tag: "ended",
          at: after("20 minutes"),
          reason: "missing",
        });
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "puts a channel's threads off for half an hour when its platform is down",
    () => {
      const world = makeWorld();

      world.state.posts.push(followedPost(1), followedPost(2));
      world.state.read = () => Effect.fail(new PlatformUnavailable());

      return Effect.gen(function* collecting() {
        const report = yield* runAt(after("10 minutes"));

        assert.strictEqual(report.postponed, 2);
        assert.strictEqual(report.left, 0);

        for (const thread of world.state.threads.values()) {
          assert.deepStrictEqual(thread.collection, {
            _tag: "collecting",
            nextAt: after("40 minutes"),
          });
        }

        // Nothing is due before then: the platform is left alone.
        yield* runAt(after("20 minutes"));

        assert.lengthOf(world.state.reads, 1);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "ends the threads of a channel that left, or whose platform Peal reads no comments on",
    () => {
      const world = makeWorld();

      world.state.posts.push(
        followedPost(1),
        followedPost(2, { channelId: channelId(2) })
      );

      world.state.read = (request) =>
        Effect.fail(
          new ChannelUnreadable({
            reason:
              request.channelId === channelId(1)
                ? "disconnected"
                : "unsupported",
          })
        );

      return Effect.gen(function* collecting() {
        const report = yield* runAt(after("10 minutes"));

        assert.strictEqual(report.ended, 2);
        assert.deepStrictEqual(
          [...world.state.threads.values()]
            .map(({ collection }) =>
              collection._tag === "ended" ? collection.reason : collection._tag
            )
            .toSorted(),
          ["disconnected", "unsupported"]
        );
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "keeps a channel that is off waiting, in case it comes back",
    () => {
      const world = makeWorld();

      world.state.posts.push(followedPost(1));
      world.state.read = () =>
        Effect.fail(new ChannelUnreadable({ reason: "paused" }));

      return Effect.gen(function* collecting() {
        const report = yield* runAt(after("10 minutes"));

        assert.strictEqual(report.postponed, 1);
        assert.strictEqual(onlyThread(world).collection._tag, "collecting");
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "puts off the threads a platform that slows down did not read",
    () => {
      const world = makeWorld();

      for (let n = 1; n <= 12; n += 1) {
        world.state.posts.push(followedPost(n));
      }

      // The first thread of the first call, then a halt.
      world.state.read = (request) =>
        Effect.succeed({
          halted: true,
          readings: request.threads.slice(0, 1).map(({ threadId }) => ({
            _tag: "read" as const,
            comments: [],
            complete: true,
            threadId,
          })),
        });

      return Effect.gen(function* collecting() {
        const report = yield* runAt(after("10 minutes"));

        assert.lengthOf(world.state.reads, 1);
        assert.strictEqual(report.read, 1);
        assert.strictEqual(report.postponed, 11);
        assert.strictEqual(report.left, 0);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "reads ten threads a call, a channel's share a run, and leaves the rest due",
    () => {
      const world = makeWorld();

      for (let n = 1; n <= 35; n += 1) {
        world.state.posts.push(followedPost(n));
      }

      return Effect.gen(function* collecting() {
        const report = yield* runAt(after("10 minutes"));

        assert.deepStrictEqual(
          world.state.reads.map(({ threads }) => threads.length),
          [10, 10, 10]
        );
        assert.strictEqual(report.read, 30);
        assert.strictEqual(report.left, 5);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("stops reading a post once it leaves the window", () => {
    const world = makeWorld();

    world.state.posts.push(followedPost(1));

    return Effect.gen(function* collecting() {
      yield* runAt(after("10 minutes"));

      // Every run until the window ends would read it; jump to its last.
      const thread = onlyThread(world);

      world.state.threads.set(
        thread.id,
        recordCollection(
          thread,
          after("719 hours"),
          after("719 hours"),
          Duration.days(30)
        )
      );

      const report = yield* runAt(after("720 hours"));

      assert.strictEqual(report.ended, 1);
      assert.deepStrictEqual(onlyThread(world).collection, {
        _tag: "ended",
        at: after("720 hours"),
        reason: "window",
      });
    }).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "follows only the posts still in the window on its first run",
    () => {
      const world = makeWorld();

      world.state.posts.push(
        followedPost(1),
        followedPost(2, {
          publishedAt: DateTime.subtractDuration(publishedAt, "40 days"),
        })
      );

      return Effect.gen(function* collecting() {
        const report = yield* runAt(after("10 minutes"));

        assert.strictEqual(report.discovered, 1);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("starts no read once the run is out of time", () => {
    const world = makeWorld();

    world.state.posts.push(followedPost(1));

    return Effect.gen(function* collecting() {
      // The run scheduled at 09:10 starts at 09:19: past its 8 minutes.
      yield* TestClock.setTime(DateTime.toEpochMillis(after("19 minutes")));

      const report = yield* CollectComments.use((collect) =>
        collect.run(after("10 minutes"))
      );

      assert.lengthOf(world.state.reads, 0);
      assert.strictEqual(report.left, 1);
    }).pipe(Effect.provide(world.layer));
  });
});
