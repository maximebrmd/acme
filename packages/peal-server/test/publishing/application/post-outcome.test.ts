import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Fiber, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import {
  makePostOutcomes,
  PostOutcomes,
} from "#publishing/application/post-outcomes.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  callsOn,
  eventually,
  isFinished,
  targetsOf,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { actorIn, contentOf } from "#test/publishing/support.ts";

// Waiting, for a bounded time, until a post went out on its channels: what
// `send` answers with when asked to wait.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

const now = (
  channels: readonly [ChannelId, ...ChannelId[]],
  text: string,
  at?: string
): SendPostRequest => ({
  at: Option.fromUndefinedOr(at).pipe(Option.map(utc)),
  channelIds: channels,
  content: contentOf(text),
  idempotency: Option.none(),
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
});

// The answer a waiting request or use case comes to, with virtual time
// moved a second at a time until it has one: it sleeps on the clock, and
// may not have started when this does.
const answerOf = <A, E>(waiting: Fiber.Fiber<A, E>) =>
  Effect.gen(function* answering() {
    for (let round = 0; round < 200; round += 1) {
      if (waiting.pollUnsafe() !== undefined) {
        break;
      }

      yield* TestClock.adjust(Duration.seconds(1));
      yield* TestClock.withLive(Effect.sleep(Duration.millis(10)));
    }

    return yield* Fiber.join(waiting);
  });

// Whether the request answered, or read the post more than `seen` times.
const movedOn = <A, E>(
  waiting: Fiber.Fiber<A, E>,
  reads: Ref.Ref<number>,
  seen: number
) =>
  Ref.get(reads).pipe(
    Effect.map((read) => waiting.pollUnsafe() !== undefined || read > seen)
  );

// Waits, in real time, until the request answered or read the post again.
const untilMovedOn = <A, E>(
  waiting: Fiber.Fiber<A, E>,
  reads: Ref.Ref<number>,
  seen: number
) =>
  Effect.gen(function* settling() {
    for (let round = 0; round < 2000; round += 1) {
      if (yield* movedOn(waiting, reads, seen)) {
        return;
      }

      yield* TestClock.withLive(Effect.sleep(Duration.millis(5)));
    }

    assert.fail("The waiting request neither read the post nor answered");
  });

// The answer a waiting request comes to, with virtual time moved a second
// each time it has read the post again: never while a read is under way.
const answerAfterReads = <A, E>(
  waiting: Fiber.Fiber<A, E>,
  reads: Ref.Ref<number>
) =>
  Effect.gen(function* answering() {
    // Its first read: it has started, and its wait is counted from now.
    yield* untilMovedOn(waiting, reads, 0);

    for (let round = 0; round < 200; round += 1) {
      if (waiting.pollUnsafe() !== undefined) {
        break;
      }

      const seen = yield* Ref.get(reads);

      yield* TestClock.adjust(Duration.seconds(1));
      yield* untilMovedOn(waiting, reads, seen);
    }

    return yield* Fiber.join(waiting);
  });

describe("PostOutcomes.await", () => {
  it.effect(
    "answers each channel's result once all have one, or what it has when the time runs out",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* waits() {
          const scheduling = yield* PostScheduling;
          const outcomes = yield* PostOutcomes;
          const platform = yield* FakePlatform;
          const workspaceId = yield* freshWorkspace;
          const quick = yield* connect(workspaceId, "mastodon");
          const slow = yield* connect(workspaceId, "mastodon");
          const refusing = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          yield* platform.script(slow, [{ _tag: "hang" }]);
          yield* platform.script(refusing, [
            { _tag: "fail", failure: new BadRequest({ code: "refused" }) },
          ]);

          const sent = yield* scheduling.send(
            actor,
            now([quick, slow, refusing], "A synthetic post, out now.")
          );

          const waiting = yield* outcomes
            .await(actor, sent.post.id, Duration.seconds(30))
            .pipe(Effect.forkChild);

          yield* eventually(
            "the quick channel published, and the refusing one failed",
            targetsOf(sent.post.id).pipe(
              Effect.map(
                (targets) =>
                  targets.filter(({ status }) => status._tag !== "publishing")
                    .length === 2 &&
                  targets.every(({ status }) => status._tag !== "pending")
              )
            )
          );

          // The slow channel says nothing: the time runs out.
          const partial = yield* answerOf(waiting);

          assert.isFalse(partial.settled);
          assert.strictEqual(partial.post.status._tag, "publishing");
          assert.deepStrictEqual(
            partial.targets.map(({ channelId, status }) => [
              channelId,
              status._tag,
            ]),
            [
              [quick, "published"],
              [slow, "publishing"],
              [refusing, "failed"],
            ]
          );

          // Asked again, it answers as soon as the last channel has.
          const again = yield* outcomes
            .await(actor, sent.post.id, Duration.seconds(30))
            .pipe(Effect.forkChild);

          yield* platform.release(slow);
          yield* eventually("the post finished", isFinished(sent.post.id));

          const whole = yield* answerOf(again);

          assert.isTrue(whole.settled);
          assert.strictEqual(whole.post.status._tag, "finished");

          const [first, , third] = whole.targets;

          assert.strictEqual(first?.status._tag, "published");

          assert.strictEqual(third?.status._tag, "failed");

          if (third?.status._tag === "failed") {
            assert.strictEqual(third.status.reason, "contentRejected");
          }

          // A finished post is answered at once, however long is asked.
          const done = yield* outcomes.await(
            actor,
            sent.post.id,
            Duration.seconds(30)
          );

          assert.isTrue(done.settled);
        })
      ),
    timeout
  );

  it.effect(
    "does not wait for a post whose time comes later, nor longer than a minute",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* bounded() {
          const scheduling = yield* PostScheduling;
          const outcomes = yield* PostOutcomes;
          const platform = yield* FakePlatform;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          const later = yield* scheduling.send(
            actor,
            now(
              [channel],
              "A synthetic post, for later.",
              "2026-06-15T09:00:00Z"
            )
          );

          // Its time is past the wait: answered at once, still scheduled.
          const scheduled = yield* outcomes.await(
            actor,
            later.post.id,
            Duration.seconds(30)
          );

          assert.isFalse(scheduled.settled);
          assert.strictEqual(scheduled.post.status._tag, "scheduled");

          // No time to wait: the post as it stands.
          yield* platform.script(channel, [{ _tag: "hang" }]);

          const hanging = yield* scheduling.send(
            actor,
            now([channel], "A synthetic post that hangs.")
          );

          yield* eventually(
            "the call is in flight",
            callsOn(channel).pipe(Effect.map((calls) => calls.length === 1))
          );

          const atOnce = yield* outcomes.await(
            actor,
            hanging.post.id,
            Duration.zero
          );

          assert.isFalse(atOnce.settled);

          // An hour asked is a minute waited. Time moves a second once
          // the request has read the post again, however long the database
          // takes: moved on a timer, it runs ahead of a slow read, and the
          // minute measured grows with the load.
          const reads = yield* Ref.make(0);
          const repository = yield* PostRepository;

          const counted = yield* makePostOutcomes(1).pipe(
            Effect.provideService(
              PostRepository,
              PostRepository.of({
                ...repository,
                targets: (postId) =>
                  repository
                    .targets(postId)
                    .pipe(
                      Effect.tap(() => Ref.update(reads, (read) => read + 1))
                    ),
              })
            )
          );

          const before = yield* DateTime.now;

          const capped = yield* counted
            .await(actor, hanging.post.id, Duration.hours(1))
            .pipe(Effect.forkChild);

          assert.isFalse((yield* answerAfterReads(capped, reads)).settled);

          // A minute, and the second in which it is found over.
          const waited = Duration.toSeconds(
            DateTime.distance(before, yield* DateTime.now)
          );

          assert.isAtLeast(waited, 60);
          assert.isAtMost(waited, 61);

          // A server lets so many requests wait at once: one more is
          // answered at once, with the post as it stands, and asks again.
          const one = yield* makePostOutcomes(1);

          const first = yield* one
            .await(actor, hanging.post.id, Duration.seconds(30))
            .pipe(Effect.forkChild);

          yield* TestClock.withLive(Effect.sleep(Duration.millis(50)));

          const crowded = yield* one.await(
            actor,
            hanging.post.id,
            Duration.seconds(30)
          );

          assert.isFalse(crowded.settled);
          assert.strictEqual(crowded.post.status._tag, "publishing");
          assert.isFalse((yield* answerOf(first)).settled);

          yield* platform.release(channel);
          yield* eventually("the post finished", isFinished(hanging.post.id));

          // Another workspace's post is no post, and reading needs a role.
          const stranger = yield* outcomes
            .await(actorIn(yield* freshWorkspace), later.post.id, Duration.zero)
            .pipe(Effect.flip);

          assert.strictEqual(stranger._tag, "PostNotFound");

          const missing = yield* outcomes
            .await(actor, yield* newId(PostIdSchema), Duration.zero)
            .pipe(Effect.flip);

          assert.strictEqual(missing._tag, "PostNotFound");

          const denied = yield* outcomes
            .await(actorIn(workspaceId, []), later.post.id, Duration.zero)
            .pipe(Effect.flip);

          assert.strictEqual(denied._tag, "MissingPermission");

          yield* scheduling.cancel(actor, later.post.id);
        })
      ),
    timeout
  );
});
