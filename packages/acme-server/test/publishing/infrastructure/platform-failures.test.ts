import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { PublicationJournal } from "#publishing/application/publication-journal.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";

import {
  attemptsOf,
  callsOn,
  eventually,
  isFinished,
  isSuspended,
  isTargetWaiting,
  journalOf,
  journalWith,
  newChannel,
  onServerAt,
  outcomeOf,
  publishingTestWith,
  Reconnects,
  scheduleIn,
  schedulePost,
  setTime,
  settle,
  targetsOf,
} from "./harness.ts";

const timeout = 60_000;

const scheduledAt = "2026-06-15T08:00:00Z";

// A post on one fresh channel, scripted, at 08:00, with the job asleep.
const scriptedPost = (
  behaviours: Parameters<FakePlatform["Service"]["script"]>[1]
) =>
  Effect.gen(function* scripting() {
    const platform = yield* FakePlatform;
    const channel = yield* newChannel;

    yield* platform.script(channel, behaviours);

    const post = yield* schedulePost([channel], scheduleIn(scheduledAt));

    yield* eventually("the job sleeps", isSuspended(post.id));

    return { channel, post };
  });

const callCount = (channel: Parameters<typeof callsOn>[0], count: number) =>
  callsOn(channel).pipe(Effect.map((calls) => calls.length === count));

const onlyTarget = (postId: Parameters<typeof targetsOf>[0]) =>
  targetsOf(postId).pipe(
    Effect.flatMap(([target]) =>
      target === undefined
        ? Effect.die("The post has no target")
        : Effect.succeed(target)
    )
  );

describe("PublishTargetV1 when the platform refuses", () => {
  it.effect(
    "waits out a rate limit, then sends again with a new key",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* waitsOutRateLimit() {
          const { channel, post } = yield* scriptedPost([
            {
              _tag: "fail",
              failure: new RateLimited({ retryAfter: Duration.minutes(15) }),
            },
          ]);

          const target = yield* onlyTarget(post.id);

          yield* setTime(scheduledAt);
          yield* eventually("the first call is refused", callCount(channel, 1));
          yield* eventually("the job waits", isTargetWaiting(target.id));
          yield* TestClock.adjust(Duration.minutes(14));
          yield* settle();

          assert.lengthOf(yield* callsOn(channel), 1);

          yield* TestClock.adjust(Duration.minutes(1));
          yield* eventually("the post finishes", isFinished(post.id));

          const [first, second] = yield* callsOn(channel);

          assert(first !== undefined && second !== undefined);
          assert.isTrue(
            Duration.isGreaterThanOrEqualTo(
              DateTime.distance(first.at, second.at),
              Duration.minutes(15)
            )
          );
          assert.notStrictEqual(
            first.request.idempotencyKey,
            second.request.idempotencyKey
          );
          assert.strictEqual(yield* outcomeOf(post.id), "published");
          assert.deepStrictEqual(
            (yield* journalOf(target.id)).map((call) => call.idempotency_key),
            [first.request.idempotencyKey, second.request.idempotencyKey]
          );
          assert.deepStrictEqual(
            (yield* attemptsOf(target.id)).map((attempt) => [
              attempt.outcome,
              attempt.decision,
              attempt.retry_delay_millis,
            ]),
            [
              ["RateLimited", "retry", 900_000],
              ["published", "settle", null],
            ]
          );
        })
      ),
    timeout
  );

  it.effect(
    "backs off while the platform is unavailable, then publishes",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* backsOff() {
          const unavailable = {
            _tag: "fail",
            failure: new PlatformUnavailable(),
          } as const;

          const { channel, post } = yield* scriptedPost([
            unavailable,
            unavailable,
          ]);

          const target = yield* onlyTarget(post.id);
          const waiting = isTargetWaiting(target.id);

          yield* setTime(scheduledAt);
          yield* eventually("the first call", callCount(channel, 1));
          yield* eventually("the job waits", waiting);
          yield* TestClock.adjust(Duration.minutes(1));
          yield* eventually("the second call", callCount(channel, 2));
          yield* eventually("the job waits again", waiting);
          yield* TestClock.adjust(Duration.minutes(4));
          yield* settle();

          assert.lengthOf(yield* callsOn(channel), 2);

          yield* TestClock.adjust(Duration.minutes(1));
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(channel), 3);
          assert.strictEqual(yield* outcomeOf(post.id), "published");
        })
      ),
    timeout
  );

  it.effect(
    "gives up when the platform stays unavailable",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* givesUp() {
          const unavailable = {
            _tag: "fail",
            failure: new PlatformUnavailable(),
          } as const;

          const { channel, post } = yield* scriptedPost(
            Array.from({ length: 6 }, () => unavailable)
          );

          const target = yield* onlyTarget(post.id);

          yield* setTime(scheduledAt);

          const waits = [1, 5, 15, 60, 60].map((minutes) =>
            Duration.minutes(minutes)
          );

          for (const [index, wait] of waits.entries()) {
            yield* eventually(
              `call ${index + 1}`,
              callCount(channel, index + 1)
            );
            yield* eventually("the job waits", isTargetWaiting(target.id));
            yield* TestClock.adjust(wait);
          }

          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(channel), 6);
          assert.strictEqual(yield* outcomeOf(post.id), "failed");

          const failed = yield* onlyTarget(post.id);

          assert(failed.status._tag === "failed");
          assert.strictEqual(failed.status.reason, "unavailable");
        })
      ),
    timeout
  );

  it.effect(
    "gives a rate limit and an unavailable platform their own retries",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* countsEachRefusal() {
          const { channel, post } = yield* scriptedPost([
            {
              _tag: "fail",
              failure: new RateLimited({ retryAfter: Duration.minutes(1) }),
            },
            { _tag: "fail", failure: new PlatformUnavailable() },
          ]);

          const target = yield* onlyTarget(post.id);
          const waiting = isTargetWaiting(target.id);

          yield* setTime(scheduledAt);
          yield* eventually("the first call", callCount(channel, 1));
          yield* eventually("the job waits", waiting);
          yield* TestClock.adjust(Duration.minutes(1));
          yield* eventually("the second call", callCount(channel, 2));
          yield* eventually("the job waits again", waiting);

          // The first time the platform is unavailable: a minute, however
          // many attempts were rate limited before.
          yield* TestClock.adjust(Duration.minutes(1));
          yield* eventually("the post finishes", isFinished(post.id));

          assert.strictEqual(yield* outcomeOf(post.id), "published");
          assert.deepStrictEqual(
            (yield* attemptsOf(target.id)).map((attempt) => [
              attempt.outcome,
              attempt.retry_delay_millis,
            ]),
            [
              ["RateLimited", 60_000],
              ["PlatformUnavailable", 60_000],
              ["published", null],
            ]
          );
        })
      ),
    timeout
  );

  it.effect(
    "fails and asks for a reconnect when the token is refused",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* asksToReconnect() {
          const { channel, post } = yield* scriptedPost([
            { _tag: "fail", failure: new TokenExpired() },
          ]);

          yield* setTime(scheduledAt);
          yield* eventually("the post finishes", isFinished(post.id));
          yield* TestClock.adjust(Duration.days(1));
          yield* settle();

          assert.lengthOf(yield* callsOn(channel), 1);

          const target = yield* onlyTarget(post.id);

          assert(target.status._tag === "failed");
          assert.strictEqual(target.status.reason, "tokenExpired");
          assert.deepStrictEqual(
            yield* Reconnects.use((reconnects) => reconnects.requested),
            [channel]
          );
        })
      ),
    timeout
  );

  it.effect(
    "fails at once, keeping the platform's code, when the media or the post is refused",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* failsAtOnce() {
          const platform = yield* FakePlatform;
          const media = yield* newChannel;
          const text = yield* newChannel;

          yield* platform.script(media, [
            { _tag: "fail", failure: new MediaRejected({ code: "too_large" }) },
          ]);
          yield* platform.script(text, [
            { _tag: "fail", failure: new BadRequest({ code: "duplicate" }) },
          ]);

          const post = yield* schedulePost(
            [media, text],
            scheduleIn(scheduledAt)
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime(scheduledAt);
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* platform.calls, 2);
          assert.strictEqual(yield* outcomeOf(post.id), "failed");

          const failures = (yield* targetsOf(post.id)).map((target) => {
            assert(target.status._tag === "failed");

            return [
              target.channelId,
              target.status.reason,
              Option.getOrUndefined(target.status.code),
            ];
          });

          assert.sameDeepMembers(failures, [
            [media, "mediaRejected", "too_large"],
            [text, "contentRejected", "duplicate"],
          ]);
        })
      ),
    timeout
  );
});

describe("PublishTargetV1 when the outcome is unknown", () => {
  it.effect(
    "marks a post whose answer was lost unconfirmed, and never sends it again",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* neverRetriesUnknown() {
          const platform = yield* FakePlatform;

          const { channel, post } = yield* scriptedPost([
            { _tag: "loseResponse" },
          ]);

          yield* setTime(scheduledAt);
          yield* eventually("the post finishes", isFinished(post.id));
          yield* TestClock.adjust(Duration.days(1));
          yield* settle();

          assert.lengthOf(yield* callsOn(channel), 1);
          assert.lengthOf(yield* platform.live, 1);
          assert.strictEqual(yield* outcomeOf(post.id), "unconfirmed");

          const target = yield* onlyTarget(post.id);

          assert(target.status._tag === "unconfirmed");
          assert.strictEqual(target.status.reason, "noResponse");
        })
      ),
    timeout
  );
});

// A journal whose first write of how a call ended fails, as when the
// connection drops just after the platform answered.
const FinishFailingOnce = journalWith((journal) =>
  Ref.make(1).pipe(
    Effect.map((failures) =>
      PublicationJournal.of({
        ...journal,
        finish: (...call) =>
          Ref.getAndUpdate(failures, (left) => Math.max(0, left - 1)).pipe(
            Effect.flatMap((left) =>
              left > 0
                ? Effect.fail(new DatabaseError({ cause: "connection lost" }))
                : journal.finish(...call)
            )
          ),
      })
    )
  )
);

describe("PublishTargetV1 when the database fails", () => {
  it.effect(
    "keeps a published answer when recording it fails once",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* keepsPublished() {
          const { channel, post } = yield* scriptedPost([{ _tag: "succeed" }]);

          yield* setTime(scheduledAt);
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(channel), 1);
          assert.strictEqual(yield* outcomeOf(post.id), "published");

          const target = yield* onlyTarget(post.id);

          assert(target.status._tag === "published");
          assert.isTrue(Option.isSome(target.status.platformPostId));
          assert.deepStrictEqual(
            (yield* attemptsOf(target.id)).map((attempt) => attempt.outcome),
            ["published"]
          );
        }),
        publishingTestWith(FinishFailingOnce)
      ),
    timeout
  );
});
