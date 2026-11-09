import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Fiber, Ref } from "effect";
import { TestClock } from "effect/testing";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { sequenced } from "#publishing/application/publication-steps.ts";
import type {
  LookUp,
  PublicationSteps,
  Readiness,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

// The sequencing of a platform's steps, on steps held in memory, under the
// test clock: how long it waits, and when it sends a post again.

const timing: StepTiming = {
  confirmDelays: [Duration.seconds(5), Duration.seconds(30)],
  longestPoll: Duration.minutes(1),
  processingLimit: Duration.minutes(15),
};

const published: Published = {
  _tag: "published",
  platformPostId: PlatformPostIdSchema.make("post-1"),
};

/** What the next commit answers: the post, an unknown outcome, a refusal. */
type CommitAnswer =
  | { readonly _tag: "published" }
  | { readonly _tag: "unknown" }
  | { readonly _tag: "refused"; readonly failure: PublishFailure };

interface Options {
  readonly commits?: readonly CommitAnswer[];
  readonly confirmation:
    | { readonly _tag: "lookUp"; readonly found: readonly LookUp["_tag"][] }
    | { readonly _tag: "resend"; readonly window: Duration.Duration };
  // How many looks at the media find it still processing, a minute apart.
  readonly processing?: number;
}

// Media that the platform processes for `remaining` more looks.
const readiness = (remaining: number): Readiness<number> =>
  remaining > 0
    ? {
        _tag: "processing",
        pollAfter: Duration.minutes(1),
        prepared: remaining - 1,
      }
    : { _tag: "ready", prepared: 0 };

// Steps that record when each commit was sent, by the test clock.
const stepsWith = Effect.fn("test.stepsWith")(function* stepsWith(
  options: Options
) {
  const sentAt = yield* Ref.make<readonly DateTime.Utc[]>([]);
  const answers = yield* Ref.make(options.commits ?? []);
  const looks = yield* Ref.make(0);

  const found =
    options.confirmation._tag === "lookUp" ? options.confirmation.found : [];

  const steps: PublicationSteps<number> = {
    commit: () =>
      Effect.gen(function* commit() {
        const now = yield* DateTime.now;

        yield* Ref.update(sentAt, (before) => [...before, now]);

        const [answer, ...rest] = yield* Ref.get(answers);

        yield* Ref.set(answers, rest);

        if (answer?._tag === "unknown") {
          return yield* new OutcomeUnknown({ reason: "noResponse" });
        }

        return answer?._tag === "refused"
          ? yield* Effect.fail(answer.failure)
          : published;
      }),
    confirmation:
      options.confirmation._tag === "resend"
        ? options.confirmation
        : {
            _tag: "lookUp",
            lookUp: () =>
              Ref.getAndUpdate(looks, (count) => count + 1).pipe(
                Effect.map((index): LookUp => {
                  const tag = found[index] ?? "unknown";

                  return tag === "found"
                    ? { _tag: "found", published }
                    : { _tag: tag };
                })
              ),
          },
    platform: "mastodon",
    poll: (_post, remaining) => Effect.succeed(readiness(remaining)),
    prepare: () => Effect.succeed(readiness(options.processing ?? 0)),
  };

  return { client: sequenced(steps, timing), sentAt: Ref.get(sentAt) };
});

const postStarted = (startedAt: DateTime.Utc): OutgoingPost => ({
  accountId: "synthetic@mastodon.test",
  channelId: ChannelIdSchema.make("01900000-0000-7000-8000-0000000000d1"),
  idempotencyKey: "4c9a82ce3e1a3b5b0a1f3bd3c1a7e0a2",
  media: [],
  startedAt,
  text: "A synthetic post for tests.",
  workspaceId: WorkspaceIdSchema.make("6a1c2d3e-4f50-4617-8829-3a4b5c6d7e8f"),
});

// Runs `effect` while the test clock moves an hour ahead.
const withinTheHour = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function* running() {
    const fiber = yield* Effect.forkChild(effect);

    yield* TestClock.adjust(Duration.hours(1));

    return yield* Fiber.join(fiber);
  });

const minutesAgo = (minutes: number) =>
  DateTime.now.pipe(
    Effect.map((now) =>
      DateTime.subtractDuration(now, Duration.minutes(minutes))
    )
  );

describe("the publication steps", () => {
  it.effect("posts once the platform has processed the media", () =>
    Effect.gen(function* processed() {
      const startedAt = yield* DateTime.now;

      const { client, sentAt } = yield* stepsWith({
        confirmation: { _tag: "resend", window: Duration.minutes(50) },
        processing: 3,
      });

      const result = yield* withinTheHour(
        client.publish(postStarted(startedAt))
      );

      const [sent] = yield* sentAt;

      assert.deepStrictEqual(result, published);
      assert.deepStrictEqual(
        sent === undefined ? undefined : DateTime.distance(startedAt, sent),
        Duration.minutes(3)
      );
    })
  );

  it.effect("gives up on media the platform takes too long to process", () =>
    Effect.gen(function* tooSlow() {
      const { client, sentAt } = yield* stepsWith({
        confirmation: { _tag: "resend", window: Duration.minutes(50) },
        processing: 20,
      });

      const failure = yield* withinTheHour(
        client.publish(postStarted(yield* DateTime.now))
      ).pipe(Effect.flip);

      assert.deepStrictEqual(failure, new PlatformUnavailable());
      assert.lengthOf(yield* sentAt, 0);
    })
  );

  it.effect("confirms an unknown outcome by sending again with the key", () =>
    Effect.gen(function* confirmed() {
      const { client, sentAt } = yield* stepsWith({
        commits: [{ _tag: "unknown" }, { _tag: "published" }],
        confirmation: { _tag: "resend", window: Duration.minutes(50) },
      });

      const result = yield* withinTheHour(
        client.publish(postStarted(yield* DateTime.now))
      );

      assert.deepStrictEqual(result, published);
      assert.lengthOf(yield* sentAt, 2);
    })
  );

  it.effect("resumes a post by sending it again while the key holds", () =>
    Effect.gen(function* resumed() {
      const { client, sentAt } = yield* stepsWith({
        confirmation: { _tag: "resend", window: Duration.minutes(50) },
        processing: 3,
      });

      const result = yield* withinTheHour(
        client.resume(postStarted(yield* minutesAgo(10)))
      );

      assert.deepStrictEqual(result, published);
      assert.lengthOf(yield* sentAt, 1);
    })
  );

  it.effect(
    "does not send a resumed post once the key may have lapsed while its media was processed",
    () =>
      Effect.gen(function* lapsed() {
        const { client, sentAt } = yield* stepsWith({
          confirmation: { _tag: "resend", window: Duration.minutes(50) },
          processing: 10,
        });

        // Within the window when the resume starts, past it by the time
        // the media is processed again.
        const result = yield* withinTheHour(
          client.resume(postStarted(yield* minutesAgo(45)))
        );

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "interrupted",
        });
        assert.lengthOf(yield* sentAt, 0);
      })
  );

  it.effect("stops confirming by resending once the key may have lapsed", () =>
    Effect.gen(function* lapsedConfirm() {
      const { client, sentAt } = yield* stepsWith({
        commits: [{ _tag: "unknown" }, { _tag: "unknown" }],
        confirmation: { _tag: "resend", window: Duration.minutes(50) },
        processing: 3,
      });

      // The commit, three minutes in, leaves 20 seconds of the window:
      // the first confirmation (5 seconds later) fits, the second (30
      // seconds after that) does not.
      const startedAt = DateTime.subtractDuration(
        yield* DateTime.now,
        Duration.seconds(46 * 60 + 40)
      );

      const result = yield* withinTheHour(
        client.publish(postStarted(startedAt))
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
      assert.lengthOf(yield* sentAt, 2);
    })
  );

  it.effect(
    "refuses a resumed post the platform refused for itself, not for an outage",
    () =>
      Effect.gen(function* refusedResume() {
        const startedAt = yield* minutesAgo(5);

        const rejected = yield* stepsWith({
          commits: [
            { _tag: "refused", failure: new BadRequest({ code: "invalid" }) },
          ],
          confirmation: { _tag: "resend", window: Duration.minutes(50) },
        });

        const limited = yield* stepsWith({
          commits: [{ _tag: "refused", failure: new RateLimited({}) }],
          confirmation: { _tag: "resend", window: Duration.minutes(50) },
        });

        assert.deepStrictEqual(
          yield* withinTheHour(
            rejected.client.resume(postStarted(startedAt))
          ).pipe(Effect.flip),
          new BadRequest({ code: "invalid" })
        );
        assert.deepStrictEqual(
          yield* withinTheHour(limited.client.resume(postStarted(startedAt))),
          { _tag: "unconfirmed", reason: "interrupted" }
        );
      })
  );

  it.effect("resumes a post looked up by key: found, absent, or unknown", () =>
    Effect.gen(function* lookedUp() {
      const startedAt = yield* minutesAgo(5);

      const found = yield* stepsWith({
        confirmation: { _tag: "lookUp", found: ["found"] },
      });

      const absent = yield* stepsWith({
        confirmation: { _tag: "lookUp", found: ["absent"] },
      });

      const unknown = yield* stepsWith({
        confirmation: { _tag: "lookUp", found: ["unknown"] },
      });

      assert.deepStrictEqual(
        yield* withinTheHour(found.client.resume(postStarted(startedAt))),
        published
      );
      assert.lengthOf(yield* found.sentAt, 0);
      assert.deepStrictEqual(
        yield* withinTheHour(absent.client.resume(postStarted(startedAt))),
        published
      );
      assert.lengthOf(yield* absent.sentAt, 1);
      assert.deepStrictEqual(
        yield* withinTheHour(unknown.client.resume(postStarted(startedAt))),
        { _tag: "unconfirmed", reason: "interrupted" }
      );
      assert.lengthOf(yield* unknown.sentAt, 0);
    })
  );
});
