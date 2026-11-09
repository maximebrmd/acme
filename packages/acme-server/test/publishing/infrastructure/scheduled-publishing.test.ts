import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Scope } from "effect";

import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PublicationJournal } from "#publishing/application/publication-journal.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { actorIn } from "#test/publishing/support.ts";

import {
  callsOn,
  eventually,
  isFinished,
  isSuspended,
  journalOf,
  journalWith,
  newChannel,
  onServerAt,
  outcomeOf,
  restartable,
  scheduleIn,
  schedulePost,
  setTime,
  settle,
  shutDown,
  storedPost,
  targetsOf,
  targetStatuses,
  utc,
} from "./harness.ts";
import { Outcomes } from "./recorded-outcomes.ts";

const timeout = 60_000;

describe("PublishPostV1", () => {
  it.effect(
    "publishes each channel once, at the instant and not before",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* publishesAtTheInstant() {
          const platform = yield* FakePlatform;
          const first = yield* newChannel;
          const second = yield* newChannel;

          const post = yield* schedulePost(
            [first, second],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T07:59:59Z");
          yield* settle();

          assert.lengthOf(yield* platform.calls, 0);
          assert.strictEqual(
            (yield* storedPost(post.id)).post.status._tag,
            "scheduled"
          );

          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(first), 1);
          assert.lengthOf(yield* callsOn(second), 1);

          const calls = yield* platform.calls;

          assert.isTrue(
            calls.every((call) =>
              DateTime.isGreaterThanOrEqualTo(
                call.at,
                utc("2026-06-15T08:00:00Z")
              )
            )
          );
          assert.strictEqual(yield* outcomeOf(post.id), "published");

          const targets = yield* targetsOf(post.id);

          assert.deepStrictEqual(targetStatuses(targets), [
            "published",
            "published",
          ]);
          assert.isTrue(
            targets.every(
              ({ status }) =>
                status._tag === "published" &&
                Option.isSome(status.platformPostId)
            )
          );
        })
      ),
    timeout
  );

  it.effect(
    "publishes a post scheduled in a time zone at its UTC instant",
    () =>
      onServerAt(
        "2026-03-28T12:00:00Z",
        Effect.gen(function* publishesAcrossDaylightSaving() {
          const platform = yield* FakePlatform;
          const channel = yield* newChannel;

          // 09:00 in Paris on the first day of summer time is 07:00 UTC.
          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-03-29T07:00:00Z", "Europe/Paris")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-03-29T06:59:59Z");
          yield* settle();

          assert.lengthOf(yield* platform.calls, 0);

          yield* setTime("2026-03-29T07:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          const { post: stored } = yield* storedPost(post.id);

          assert(stored.status._tag === "finished");
          assert.strictEqual(stored.status.schedule.timeZone, "Europe/Paris");
          assert.lengthOf(yield* platform.calls, 1);
        })
      ),
    timeout
  );
});

describe("ChannelGate", () => {
  it.effect(
    "sends the calls on one channel one at a time",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* serialisesCalls() {
          const platform = yield* FakePlatform;
          const channel = yield* newChannel;
          const other = yield* newChannel;

          yield* platform.script(channel, [{ _tag: "hang" }]);

          const at = scheduleIn("2026-06-15T08:00:00Z");
          const first = yield* schedulePost([channel], at);
          const second = yield* schedulePost([channel, other], at);

          yield* eventually("both jobs sleep", isSuspended(second.id));
          yield* setTime("2026-06-15T08:00:00Z");

          // The other channel is not held up; this one waits on the call
          // that hangs.
          yield* eventually(
            "the other channel publishes",
            callsOn(other).pipe(Effect.map((calls) => calls.length === 1))
          );
          yield* settle();

          assert.lengthOf(yield* callsOn(channel), 1);

          yield* platform.release(channel);
          yield* eventually("the first post finishes", isFinished(first.id));
          yield* eventually("the second post finishes", isFinished(second.id));

          assert.lengthOf(yield* callsOn(channel), 2);
          assert.strictEqual(yield* platform.mostInFlight, 1);
          assert.strictEqual(yield* outcomeOf(first.id), "published");
          assert.strictEqual(yield* outcomeOf(second.id), "published");
        })
      ),
    timeout
  );
});

describe("restarts", () => {
  it.effect(
    "marks a post missed when the server comes back too late",
    () =>
      Effect.gen(function* missesAfterDowntime() {
        yield* setTime("2026-06-15T07:00:00Z");

        const { platform, server } = yield* restartable;
        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(server, before);
        const channel = yield* newChannel;

        const post = yield* schedulePost(
          [channel],
          scheduleIn("2026-06-15T08:00:00Z")
        ).pipe(Effect.provideContext(first));

        yield* eventually("the job sleeps", isSuspended(post.id)).pipe(
          Effect.provideContext(first)
        );
        yield* shutDown(before);

        // Down for more than the hour a post may be late.
        yield* setTime("2026-06-15T09:30:00Z");

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the post finishes", isFinished(post.id)).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(yield* platform.calls, 0);
        assert.strictEqual(
          yield* outcomeOf(post.id).pipe(Effect.provideContext(second)),
          "failed"
        );

        const [target] = yield* targetsOf(post.id).pipe(
          Effect.provideContext(second)
        );

        assert(target?.status._tag === "failed");
        assert.strictEqual(target.status.reason, "missed");

        // The members who schedule posts hear of it, as of any failure.
        const told = yield* Outcomes.use(({ told: all }) => all).pipe(
          Effect.provideContext(second)
        );

        assert.deepStrictEqual(
          told.map(({ id, status }) => ({ id, status: status._tag })),
          [{ id: target.id, status: "failed" }]
        );

        yield* shutDown(after);
      }).pipe(Effect.scoped),
    timeout
  );

  it.effect(
    "publishes a post that was due while the server was briefly down",
    () =>
      Effect.gen(function* publishesAfterShortDowntime() {
        yield* setTime("2026-06-15T07:00:00Z");

        const { platform, server } = yield* restartable;
        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(server, before);
        const channel = yield* newChannel;

        const post = yield* schedulePost(
          [channel],
          scheduleIn("2026-06-15T08:00:00Z")
        ).pipe(Effect.provideContext(first));

        yield* eventually("the job sleeps", isSuspended(post.id)).pipe(
          Effect.provideContext(first)
        );
        yield* shutDown(before);
        yield* setTime("2026-06-15T08:10:00Z");

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the post finishes", isFinished(post.id)).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(yield* platform.calls, 1);
        assert.strictEqual(
          yield* outcomeOf(post.id).pipe(Effect.provideContext(second)),
          "published"
        );

        yield* shutDown(after);
      }).pipe(Effect.scoped),
    timeout
  );

  it.effect(
    "never sends twice when the server stops during a call",
    () =>
      Effect.gen(function* neverSendsTwice() {
        yield* setTime("2026-06-15T07:00:00Z");

        const { platform, server } = yield* restartable;
        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(server, before);
        const channel = yield* newChannel;

        // The post goes live and the answer never comes back.
        yield* platform.script(channel, [{ _tag: "hang" }]);

        const post = yield* schedulePost(
          [channel],
          scheduleIn("2026-06-15T08:00:00Z")
        ).pipe(Effect.provideContext(first));

        yield* eventually("the job sleeps", isSuspended(post.id)).pipe(
          Effect.provideContext(first)
        );
        yield* setTime("2026-06-15T08:00:00Z");
        yield* eventually(
          "the call is in flight",
          platform.calls.pipe(Effect.map((calls) => calls.length === 1))
        ).pipe(Effect.provideContext(first));
        yield* shutDown(before);

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the post finishes", isFinished(post.id)).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(yield* platform.calls, 1);
        assert.lengthOf(yield* platform.live, 1);
        assert.strictEqual(
          yield* outcomeOf(post.id).pipe(Effect.provideContext(second)),
          "unconfirmed"
        );

        const [target] = yield* targetsOf(post.id).pipe(
          Effect.provideContext(second)
        );

        assert(target?.status._tag === "unconfirmed");
        assert.strictEqual(target.status.reason, "interrupted");

        yield* shutDown(after);
      }).pipe(Effect.scoped),
    timeout
  );

  it.effect(
    "keeps a call in flight when the post is cancelled, and marks it unconfirmed after a restart",
    () =>
      Effect.gen(function* cancelledInFlight() {
        yield* setTime("2026-06-15T07:00:00Z");

        const { platform, server } = yield* restartable;
        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(server, before);
        const channel = yield* newChannel;

        // The post goes live and the answer never comes back.
        yield* platform.script(channel, [{ _tag: "hang" }]);

        const post = yield* schedulePost(
          [channel],
          scheduleIn("2026-06-15T08:00:00Z")
        ).pipe(Effect.provideContext(first));

        yield* eventually("the job sleeps", isSuspended(post.id)).pipe(
          Effect.provideContext(first)
        );
        yield* setTime("2026-06-15T08:00:00Z");
        yield* eventually(
          "the call is in flight",
          platform.calls.pipe(Effect.map((calls) => calls.length === 1))
        ).pipe(Effect.provideContext(first));

        const cancelled = yield* PostScheduling.use((scheduling) =>
          scheduling.cancel(actorIn(post.workspaceId), post.id)
        ).pipe(Effect.provideContext(first));

        assert.strictEqual(cancelled.post.status._tag, "publishing");

        yield* shutDown(before);

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the post finishes", isFinished(post.id)).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(yield* platform.calls, 1);
        assert.lengthOf(yield* platform.live, 1);
        assert.strictEqual(
          yield* outcomeOf(post.id).pipe(Effect.provideContext(second)),
          "unconfirmed"
        );

        const [target] = yield* targetsOf(post.id).pipe(
          Effect.provideContext(second)
        );

        assert(target?.status._tag === "unconfirmed");
        assert.strictEqual(target.status.reason, "interrupted");

        yield* shutDown(after);
      }).pipe(Effect.scoped),
    timeout
  );

  it.effect(
    "keeps a call that was answered when the post is cancelled before the attempt is recorded",
    () =>
      Effect.gen(function* cancelledAfterAnswer() {
        yield* setTime("2026-06-15T07:00:00Z");

        const { platform, server, serverWith } = yield* restartable;

        // The call is answered and journaled, then the server stops before
        // the attempt is recorded, as in a crash: the step runs again.
        const stopsBeforeRecording = serverWith(
          journalWith((journal) =>
            Effect.succeed(
              PublicationJournal.of({
                ...journal,
                recordAttempt: () => Effect.never,
              })
            )
          )
        );

        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(stopsBeforeRecording, before);
        const channel = yield* newChannel;

        const post = yield* schedulePost(
          [channel],
          scheduleIn("2026-06-15T08:00:00Z")
        ).pipe(Effect.provideContext(first));

        yield* eventually("the job sleeps", isSuspended(post.id)).pipe(
          Effect.provideContext(first)
        );

        const [pending] = yield* targetsOf(post.id).pipe(
          Effect.provideContext(first)
        );

        assert(pending !== undefined);

        yield* setTime("2026-06-15T08:00:00Z");
        yield* eventually(
          "the call is answered",
          journalOf(pending.id).pipe(
            Effect.map((calls) => calls.some((call) => call.finished))
          )
        ).pipe(Effect.provideContext(first));

        const cancelled = yield* PostScheduling.use((scheduling) =>
          scheduling.cancel(actorIn(post.workspaceId), post.id)
        ).pipe(Effect.provideContext(first));

        assert.strictEqual(cancelled.post.status._tag, "publishing");

        yield* shutDown(before);

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the post finishes", isFinished(post.id)).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(yield* platform.calls, 1);
        assert.strictEqual(
          yield* outcomeOf(post.id).pipe(Effect.provideContext(second)),
          "published"
        );

        const [target] = yield* targetsOf(post.id).pipe(
          Effect.provideContext(second)
        );

        assert(target?.status._tag === "published");
        assert.isTrue(Option.isSome(target.status.platformPostId));

        yield* shutDown(after);
      }).pipe(Effect.scoped),
    timeout
  );
});
