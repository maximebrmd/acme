import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Exit, Option } from "effect";
import { TestClock } from "effect/testing";

import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PublicationScheduler } from "#publishing/application/publication-scheduler.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

import {
  callsOn,
  eventually,
  executionOf,
  isFinished,
  isSuspended,
  isTargetWaiting,
  jobResult,
  newChannel,
  onServerAt,
  outcomeOf,
  PublishingLosingInterruptsTest,
  scheduleIn,
  schedulePost,
  setTime,
  settle,
  storedPost,
  targetsOf,
  targetStatuses,
} from "./harness.ts";

const timeout = 60_000;

const isComplete = (executionId: string) =>
  jobResult(executionId).pipe(Effect.map(Option.isSome));

describe("ReschedulePost", () => {
  it.effect(
    "stops the old job and publishes once, at the new time",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* movesLater() {
          const platform = yield* FakePlatform;
          const scheduling = yield* PostScheduling;
          const channel = yield* newChannel;

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          const oldJob = yield* executionOf(post.id);

          const moved = yield* scheduling.reschedule(
            post.id,
            scheduleIn("2026-06-15T09:00:00Z")
          );

          assert.strictEqual(moved.scheduleRevision, post.scheduleRevision + 1);

          const newJob = yield* executionOf(post.id);

          assert.notStrictEqual(newJob, oldJob);

          yield* eventually("the old job stops", isComplete(oldJob));

          const stopped = yield* jobResult(oldJob);

          assert.isTrue(
            Option.isSome(stopped) && Exit.hasInterrupts(stopped.value)
          );

          yield* setTime("2026-06-15T08:00:00Z");
          yield* settle();

          assert.lengthOf(yield* platform.calls, 0);

          yield* setTime("2026-06-15T09:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(channel), 1);
          assert.strictEqual(yield* outcomeOf(post.id), "published");
        })
      ),
    timeout
  );

  it.effect(
    "is refused once the job has claimed the post",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* refusedWhilePublishing() {
          const platform = yield* FakePlatform;
          const scheduling = yield* PostScheduling;
          const channel = yield* newChannel;

          yield* platform.script(channel, [{ _tag: "hang" }]);

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually(
            "the call is in flight",
            platform.calls.pipe(Effect.map((calls) => calls.length === 1))
          );

          const refused = yield* scheduling
            .reschedule(post.id, scheduleIn("2026-06-15T10:00:00Z"))
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "InvalidPostTransition");

          yield* platform.release(channel);
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* platform.calls, 1);
          assert.strictEqual(yield* outcomeOf(post.id), "published");
        })
      ),
    timeout
  );

  it.effect(
    "leaves nothing for a job from an earlier time to publish, even when it wakes",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* staleJobIsSuperseded() {
          const platform = yield* FakePlatform;
          const scheduling = yield* PostScheduling;
          const channel = yield* newChannel;

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          const oldJob = yield* executionOf(post.id);

          // This scheduler loses the interrupt: the old job keeps sleeping.
          yield* scheduling.reschedule(
            post.id,
            scheduleIn("2026-06-15T09:00:00Z")
          );

          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the old job wakes and stops", isComplete(oldJob));

          assert.deepStrictEqual(
            yield* jobResult(oldJob),
            Option.some(Exit.succeed("superseded"))
          );
          assert.lengthOf(yield* platform.calls, 0);
          assert.strictEqual(
            (yield* storedPost(post.id)).post.status._tag,
            "scheduled"
          );

          yield* setTime("2026-06-15T09:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* platform.calls, 1);
        }),
        PublishingLosingInterruptsTest
      ),
    timeout
  );

  it.effect(
    "runs one job when the same revision is started twice",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* startsOnce() {
          const platform = yield* FakePlatform;
          const scheduler = yield* PublicationScheduler;
          const channel = yield* newChannel;
          const at = scheduleIn("2026-06-15T08:00:00Z");
          const post = yield* schedulePost([channel], at);
          const job = yield* executionOf(post.id);

          // A retried request starts the same revision again.
          const again = yield* scheduler.schedule({
            postId: post.id,
            revision: post.scheduleRevision,
            scheduledAt: at.at,
          });

          assert.strictEqual(again, job);

          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));
          yield* settle();

          assert.lengthOf(yield* platform.calls, 1);
        })
      ),
    timeout
  );
});

describe("CancelPost", () => {
  it.effect(
    "cancels a sleeping post and stops its job",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* cancelsWhileSleeping() {
          const platform = yield* FakePlatform;
          const scheduling = yield* PostScheduling;

          const post = yield* schedulePost(
            [yield* newChannel, yield* newChannel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          const job = yield* executionOf(post.id);
          const cancelled = yield* scheduling.cancel(post.id);

          assert.strictEqual(cancelled.status._tag, "cancelled");
          assert.deepStrictEqual(targetStatuses(yield* targetsOf(post.id)), [
            "cancelled",
            "cancelled",
          ]);

          yield* eventually("the job stops", isComplete(job));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* settle();

          assert.lengthOf(yield* platform.calls, 0);
          assert.strictEqual(
            (yield* storedPost(post.id)).post.status._tag,
            "cancelled"
          );

          const again = yield* scheduling.cancel(post.id).pipe(Effect.flip);

          assert.strictEqual(again._tag, "InvalidPostTransition");
        })
      ),
    timeout
  );

  it.effect(
    "stops the next attempt of a channel waiting out a rate limit",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* cancelsBetweenAttempts() {
          const platform = yield* FakePlatform;
          const scheduling = yield* PostScheduling;
          const limited = yield* newChannel;
          const open = yield* newChannel;

          yield* platform.script(limited, [
            {
              _tag: "fail",
              failure: new RateLimited({ retryAfter: Duration.minutes(15) }),
            },
          ]);

          const post = yield* schedulePost(
            [limited, open],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually(
            "the open channel publishes",
            targetsOf(post.id).pipe(
              Effect.map((targets) =>
                targets.some(
                  (target) =>
                    target.channelId === open &&
                    target.status._tag === "published"
                )
              )
            )
          );
          yield* eventually(
            "the limited channel was refused",
            callsOn(limited).pipe(Effect.map((calls) => calls.length === 1))
          );

          const waiting = (yield* targetsOf(post.id)).find(
            (target) => target.channelId === limited
          );

          assert(waiting !== undefined);

          yield* eventually("its job waits", isTargetWaiting(waiting.id));

          const stillPublishing = yield* scheduling.cancel(post.id);

          assert.strictEqual(stillPublishing.status._tag, "publishing");

          yield* TestClock.adjust(Duration.minutes(15));
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(limited), 1);
          assert.strictEqual(yield* outcomeOf(post.id), "partiallyPublished");

          const targets = yield* targetsOf(post.id);

          const statusOn = (channelId: string) =>
            targets.find((target) => target.channelId === channelId)?.status
              ._tag;

          assert.strictEqual(statusOn(limited), "cancelled");
          assert.strictEqual(statusOn(open), "published");
        })
      ),
    timeout
  );
});
