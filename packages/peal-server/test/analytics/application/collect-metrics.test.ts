import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Metric, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import {
  collectionDuration,
  collectionLeft,
  CollectionPaceRef,
  CollectMetrics,
} from "#analytics/application/collect-metrics.ts";
import type { CollectionPace } from "#analytics/application/collect-metrics.ts";
import type {
  MetricsBatch,
  MetricsReadFailure,
  MetricsRequest,
} from "#analytics/application/metrics-reader.ts";
import { TrackedPosts } from "#analytics/application/tracked-posts.ts";
import { trackPublication } from "#analytics/domain/tracked-post.ts";
import type { Publication } from "#analytics/domain/tracked-post.ts";
import { Ids } from "#shared/application/ids.ts";
import { PostTargetIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import {
  MemoryTrackedPosts,
  StoredPosts,
} from "#test/analytics/fakes/memory-tracked-posts.ts";
import {
  Publications,
  PublishedPostsTest,
} from "#test/analytics/publications.ts";
import {
  readerAnswering,
  ReadLog,
  ReadLogTest,
} from "#test/analytics/read-log.ts";
import {
  countsOf,
  newChannelId,
  publicationOf,
} from "#test/analytics/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b"
);

type Answer = (
  request: MetricsRequest
) => Effect.Effect<MetricsBatch, MetricsReadFailure>;

// Every post read, with a like for each hour since the epoch.
const countingAll: Answer = (request) =>
  DateTime.now.pipe(
    Effect.map((now) => ({
      halted: false,
      readings: request.posts.map(({ targetId }) => ({
        _tag: "counted" as const,
        metrics: countsOf(
          Math.floor(DateTime.toEpochMillis(now) / 3_600_000) % 1000,
          1,
          0
        ),
        targetId,
      })),
    }))
  );

// The use case on the in-memory store, with publishing's posts and a
// reader answering `answer`.
const collectionWith = (
  answer: Answer = countingAll,
  pace: Partial<CollectionPace> = {}
) =>
  CollectMetrics.layer.pipe(
    Layer.provide(
      Layer.succeed(CollectionPaceRef, {
        budget: Duration.minutes(50),
        channelConcurrency: 16,
        channelsPerPage: 500,
        ...pace,
      })
    ),
    Layer.provideMerge(
      Layer.mergeAll(
        MemoryTrackedPosts,
        PublishedPostsTest,
        readerAnswering(answer)
      )
    ),
    Layer.provideMerge(Layer.mergeAll(ReadLogTest, Ids.layerTest))
  );

const utc = (iso: string) => DateTime.makeUnsafe(iso);

// How many reads run now, and the most that ever did.
const readingNow = Ref.makeUnsafe(0);

const mostAtOnce = Ref.makeUnsafe(0);

// The channel whose platform is down, in the test that has one.
const downChannel = Ref.makeUnsafe(Option.none<Publication["channelId"]>());

// The channels whose platform hangs, in the test that has some.
const hangingChannels = Ref.makeUnsafe<ReadonlySet<Publication["channelId"]>>(
  new Set()
);

// A run of the collection scheduled at `iso`, with the clock just after.
const runAt = (iso: string) =>
  TestClock.setTime(DateTime.toEpochMillis(utc(iso)) + 1500).pipe(
    Effect.andThen(CollectMetrics.use((collect) => collect.run(utc(iso))))
  );

const published = (...publications: readonly Publication[]) =>
  Publications.use((all) => all.add(...publications));

const nextAtOf = (publication: Publication) =>
  StoredPosts.use((stored) => stored.post(publication.targetId)).pipe(
    Effect.map(
      Option.flatMap((post) =>
        post.collection._tag === "collecting"
          ? Option.some(DateTime.formatIso(post.collection.nextAt))
          : Option.none()
      )
    )
  );

const snapshotsOf = (publication: Publication) =>
  StoredPosts.use((stored) => stored.snapshots(publication.targetId));

const requested = ReadLog.use((log) => log.requests);

describe("collecting post metrics", () => {
  it.effect("follows posts as they go live, and reads them next run", () =>
    Effect.gen(function* follows() {
      const mastodon = yield* newChannelId;
      const bluesky = yield* newChannelId;

      const first = yield* publicationOf(
        workspaceId,
        mastodon,
        "2026-11-02T10:20:00.000Z"
      );

      const second = yield* publicationOf(
        workspaceId,
        bluesky,
        "2026-11-02T10:40:00.000Z"
      );

      yield* published(first, second);

      const report = yield* runAt("2026-11-02T11:07:00.000Z");

      assert.deepStrictEqual(report, {
        deferred: 0,
        discovered: 2,
        ended: 0,
        left: 0,
        read: 2,
        skipped: 0,
      });
      assert.deepStrictEqual(
        (yield* requested).map(({ channelId }) => channelId).toSorted(),
        [mastodon, bluesky].toSorted()
      );
      assert.deepStrictEqual(
        yield* nextAtOf(first),
        Option.some("2026-11-02T12:07:00.000Z")
      );

      const again = yield* runAt("2026-11-02T12:07:00.000Z");

      assert.strictEqual(again.discovered, 0);
      assert.strictEqual(again.read, 2);
      assert.deepStrictEqual(
        (yield* snapshotsOf(first)).map(({ collectedAt }) =>
          DateTime.formatIso(collectedAt)
        ),
        ["2026-11-02T11:07:01.500Z", "2026-11-02T12:07:01.500Z"]
      );
    }).pipe(Effect.provide(collectionWith()))
  );

  it.effect(
    "reads a post hourly for 48 hours, daily to 30 days, then stops",
    () =>
      Effect.gen(function* schedule() {
        const channelId = yield* newChannelId;

        const post = yield* publicationOf(
          workspaceId,
          channelId,
          "2026-11-02T10:20:00.000Z"
        );

        yield* published(post);

        let at = utc("2026-11-02T11:07:00.000Z");

        // Every hourly run for 32 days.
        for (let run = 0; run < 32 * 24; run += 1) {
          yield* runAt(DateTime.formatIso(at));
          at = DateTime.addDuration(at, Duration.hours(1));
        }

        const reads = (yield* snapshotsOf(post)).map(({ collectedAt }) =>
          DateTime.formatIso(collectedAt).slice(0, 13)
        );

        // 48 hourly reads from 11:07 on the first day, to 10:07 two days on.
        assert.strictEqual(reads[0], "2026-11-02T11");
        assert.strictEqual(reads[47], "2026-11-04T10");
        // Then, from 48 hours on, one a day.
        assert.deepStrictEqual(reads.slice(48, 51), [
          "2026-11-04T11",
          "2026-11-05T11",
          "2026-11-06T11",
        ]);
        // The last read once it is 30 days old: the run after 10:20.
        assert.strictEqual(reads.at(-1), "2026-12-02T11");
        assert.lengthOf(reads, 48 + 28 + 1);

        const stored = yield* StoredPosts.use((posts) =>
          posts.post(post.targetId)
        );

        assert.deepStrictEqual(
          stored.pipe(Option.map(({ collection }) => collection._tag)),
          Option.some("ended")
        );
      }).pipe(Effect.provide(collectionWith()))
  );

  it.effect("reads 25 posts to a call, and a channel's calls in turn", () =>
    Effect.gen(function* batches() {
      const channelId = yield* newChannelId;

      const posts = yield* Effect.forEach(
        Array.from({ length: 30 }, (_, index) => index),
        (index) =>
          publicationOf(
            workspaceId,
            channelId,
            `2026-11-02T10:${String(index).padStart(2, "0")}:00.000Z`,
            String(110_000_000_000_000_000 + index)
          ),
        { concurrency: 1 }
      );

      yield* published(...posts);
      yield* runAt("2026-11-02T11:07:00.000Z");

      assert.deepStrictEqual(
        (yield* requested).map((request) => request.posts.length),
        [25, 5]
      );
      // The longest due first.
      assert.strictEqual(
        (yield* requested)[0]?.posts[0]?.targetId,
        posts[0]?.targetId
      );
    }).pipe(Effect.provide(collectionWith()))
  );

  it.effect("leaves the rest of a halted channel for the next run", () =>
    Effect.gen(function* halted() {
      const channelId = yield* newChannelId;

      const posts = yield* Effect.forEach(
        Array.from({ length: 30 }, (_, index) => index),
        (index) =>
          publicationOf(
            workspaceId,
            channelId,
            `2026-11-02T10:${String(index).padStart(2, "0")}:00.000Z`
          ),
        { concurrency: 1 }
      );

      yield* published(...posts);

      const report = yield* runAt("2026-11-02T11:07:00.000Z");

      assert.deepStrictEqual(
        { deferred: report.deferred, read: report.read },
        { deferred: 20, read: 10 }
      );
      // One call: the platform asked to slow down.
      assert.lengthOf(yield* requested, 1);
      const [first] = posts;
      const last = posts.at(-1);

      assert(first !== undefined && last !== undefined);

      // Read posts wait an hour; the others are still due.
      assert.deepStrictEqual(
        yield* nextAtOf(first),
        Option.some("2026-11-02T12:07:00.000Z")
      );
      assert.deepStrictEqual(
        yield* nextAtOf(last),
        Option.some("2026-11-02T10:29:00.000Z")
      );
    }).pipe(
      Effect.provide(
        collectionWith((request) =>
          countingAll({ ...request, posts: request.posts.slice(0, 10) }).pipe(
            Effect.map((batch) => ({ ...batch, halted: true }))
          )
        )
      )
    )
  );

  it.effect("passes over a post the platform no longer shows", () =>
    Effect.gen(function* missing() {
      const post = yield* publicationOf(
        workspaceId,
        yield* newChannelId,
        "2026-11-02T10:20:00.000Z"
      );

      yield* published(post);

      const report = yield* runAt("2026-11-02T11:07:00.000Z");

      assert.strictEqual(report.skipped, 1);
      assert.lengthOf(yield* snapshotsOf(post), 0);
      assert.deepStrictEqual(
        yield* nextAtOf(post),
        Option.some("2026-11-02T12:07:00.000Z")
      );
    }).pipe(
      Effect.provide(
        collectionWith((request) =>
          Effect.succeed({
            halted: false,
            readings: request.posts.map(({ targetId }) => ({
              _tag: "missing" as const,
              targetId,
            })),
          })
        )
      )
    )
  );

  it.effect(
    "passes over a post its server keeps failing on, and reads the channel's others",
    () =>
      Effect.gen(function* failing() {
        const channelId = yield* newChannelId;

        // Due first, as it went live first.
        const broken = yield* publicationOf(
          workspaceId,
          channelId,
          "2026-11-02T10:00:00.000Z",
          "110000000000000666"
        );

        const others = yield* Effect.forEach(
          ["10:10", "10:20"],
          (time) =>
            publicationOf(workspaceId, channelId, `2026-11-02T${time}:00.000Z`),
          { concurrency: 1 }
        );

        yield* published(broken, ...others);

        const first = yield* runAt("2026-11-02T11:07:00.000Z");
        const second = yield* runAt("2026-11-02T12:07:00.000Z");

        assert.deepStrictEqual(
          [first, second].map(({ deferred, read, skipped }) => ({
            deferred,
            read,
            skipped,
          })),
          [
            { deferred: 2, read: 0, skipped: 1 },
            { deferred: 0, read: 2, skipped: 1 },
          ]
        );

        for (const other of others) {
          assert.lengthOf(yield* snapshotsOf(other), 1);
        }

        assert.deepStrictEqual(
          yield* nextAtOf(broken),
          Option.some("2026-11-02T13:07:00.000Z")
        );
      }).pipe(
        Effect.provide(
          // A reader going through the posts in turn, as Mastodon's does,
          // which fails on the broken one and stops there.
          collectionWith((request) => {
            const at = request.posts.findIndex(
              ({ platformPostId }) => platformPostId === "110000000000000666"
            );

            if (at === -1) {
              return countingAll(request);
            }

            return countingAll({
              ...request,
              posts: request.posts.slice(0, at),
            }).pipe(
              Effect.map((batch): MetricsBatch => ({
                halted: true,
                readings: [
                  ...batch.readings,
                  {
                    _tag: "failed",
                    targetId:
                      request.posts[at]?.targetId ??
                      PostTargetIdSchema.make(""),
                  },
                ],
              }))
            );
          })
        )
      )
  );

  it.effect("stops reading the posts of a channel that left", () =>
    Effect.gen(function* disconnected() {
      const post = yield* publicationOf(
        workspaceId,
        yield* newChannelId,
        "2026-11-02T10:20:00.000Z"
      );

      yield* published(post);

      const report = yield* runAt("2026-11-02T11:07:00.000Z");
      const next = yield* runAt("2026-11-02T12:07:00.000Z");

      assert.strictEqual(report.ended, 1);
      assert.strictEqual(next.ended + next.read + next.skipped, 0);
      assert.lengthOf(yield* requested, 1);
      assert.deepStrictEqual(yield* nextAtOf(post), Option.none());
    }).pipe(
      Effect.provide(
        collectionWith(() =>
          Effect.fail(new ChannelUnreadable({ reason: "disconnected" }))
        )
      )
    )
  );

  it.effect(
    "stops reading the posts of a platform it reads no counts on, at their first turn",
    () =>
      Effect.gen(function* unsupported() {
        const post = yield* publicationOf(
          workspaceId,
          yield* newChannelId,
          "2026-11-02T10:20:00.000Z"
        );

        yield* published(post);

        const report = yield* runAt("2026-11-02T11:07:00.000Z");
        const next = yield* runAt("2026-11-02T12:07:00.000Z");

        assert.strictEqual(report.ended, 1);
        assert.strictEqual(
          next.deferred + next.ended + next.read + next.skipped,
          0
        );
        assert.lengthOf(yield* requested, 1);

        const stored = yield* StoredPosts.use((posts) =>
          posts.post(post.targetId)
        );

        assert.deepStrictEqual(
          stored.pipe(
            Option.flatMap(({ collection }) =>
              collection._tag === "ended"
                ? Option.some(collection.reason)
                : Option.none()
            )
          ),
          Option.some("unsupported")
        );
      }).pipe(
        Effect.provide(
          collectionWith(() =>
            Effect.fail(new ChannelUnreadable({ reason: "unsupported" }))
          )
        )
      )
  );

  it.effect("passes over a channel that is off until its next turn", () =>
    Effect.gen(function* paused() {
      const post = yield* publicationOf(
        workspaceId,
        yield* newChannelId,
        "2026-11-02T10:20:00.000Z"
      );

      yield* published(post);

      const report = yield* runAt("2026-11-02T11:07:00.000Z");

      assert.strictEqual(report.skipped, 1);
      assert.deepStrictEqual(
        yield* nextAtOf(post),
        Option.some("2026-11-02T12:07:00.000Z")
      );
    }).pipe(
      Effect.provide(
        collectionWith(() =>
          Effect.fail(new ChannelUnreadable({ reason: "paused" }))
        )
      )
    )
  );

  it.effect("tries again on the next run when the platform is down", () =>
    Effect.gen(function* unavailable() {
      const post = yield* publicationOf(
        workspaceId,
        yield* newChannelId,
        "2026-11-02T10:20:00.000Z"
      );

      yield* published(post);

      const report = yield* runAt("2026-11-02T11:07:00.000Z");

      assert.strictEqual(report.deferred, 1);
      assert.deepStrictEqual(
        yield* nextAtOf(post),
        Option.some("2026-11-02T10:20:00.000Z")
      );
    }).pipe(
      Effect.provide(
        collectionWith(() => Effect.fail(new PlatformUnavailable()))
      )
    )
  );

  it.effect("finds posts whose publication settled after the last run", () =>
    Effect.gen(function* late() {
      const channelId = yield* newChannelId;

      const early = yield* publicationOf(
        workspaceId,
        channelId,
        "2026-11-02T11:00:00.000Z"
      );

      // Went live at 10:55, but settled after the run at 11:07 looked.
      const settledLate = yield* publicationOf(
        workspaceId,
        channelId,
        "2026-11-02T10:55:00.000Z"
      );

      yield* published(early);
      yield* runAt("2026-11-02T11:07:00.000Z");
      yield* published(settledLate);

      const report = yield* runAt("2026-11-02T12:07:00.000Z");

      assert.strictEqual(report.discovered, 1);
      assert.lengthOf(yield* snapshotsOf(settledLate), 1);
    }).pipe(Effect.provide(collectionWith()))
  );

  it.effect(
    "moves on when more posts went live together than a run follows",
    () =>
      Effect.gen(function* crowded() {
        const channelId = yield* newChannelId;
        const start = utc("2026-11-02T10:00:00.000Z");

        // What a run follows at most, all within five minutes, and one more:
        // each run looks back over more than it follows.
        const crowd = yield* Effect.forEach(
          Array.from({ length: 10_001 }, (_, index) => index),
          (index) =>
            publicationOf(
              workspaceId,
              channelId,
              DateTime.formatIso(
                DateTime.addDuration(start, Duration.millis(index * 30))
              )
            ),
          { concurrency: 1 }
        );

        yield* published(...crowd);

        const first = yield* runAt("2026-11-02T11:07:00.000Z");
        const second = yield* runAt("2026-11-02T12:07:00.000Z");

        assert.deepStrictEqual(
          [first.discovered, second.discovered],
          [10_000, 1]
        );
      }).pipe(
        Effect.provide(
          collectionWith(() => Effect.fail(new PlatformUnavailable()))
        )
      )
  );

  it.effect("reads other channels while one's posts, put off, fill a run", () =>
    Effect.gen(function* crowdedOut() {
      const down = yield* newChannelId;
      const other = yield* newChannelId;
      const start = utc("2026-11-02T10:00:00.000Z");

      // As many posts as a run reads, on a channel whose platform is down,
      // all due before the other channel's one.
      const putOff = yield* Effect.forEach(
        Array.from({ length: 5000 }, (_, index) => index),
        (index) =>
          publicationOf(
            workspaceId,
            down,
            DateTime.formatIso(
              DateTime.addDuration(start, Duration.millis(index * 100))
            )
          ),
        { concurrency: 1 }
      );

      const waiting = yield* publicationOf(
        workspaceId,
        other,
        "2026-11-02T10:20:00.000Z",
        "110000000000000002"
      );

      yield* published(...putOff, waiting);

      const report = yield* runAt("2026-11-02T11:07:00.000Z");

      assert.strictEqual(report.read, 1);
      assert.lengthOf(yield* snapshotsOf(waiting), 1);
    }).pipe(
      Effect.provide(
        collectionWith((request) =>
          request.posts.some(
            ({ platformPostId }) => platformPostId === "110000000000000002"
          )
            ? countingAll(request)
            : Effect.fail(new PlatformUnavailable())
        )
      )
    )
  );

  it.effect("follows only posts young enough to be read, the first time", () =>
    Effect.gen(function* firstRun() {
      const channelId = yield* newChannelId;

      const old = yield* publicationOf(
        workspaceId,
        channelId,
        "2026-09-01T10:00:00.000Z"
      );

      const recent = yield* publicationOf(
        workspaceId,
        channelId,
        "2026-10-20T10:00:00.000Z"
      );

      yield* published(old, recent);

      const report = yield* runAt("2026-11-02T11:07:00.000Z");

      assert.strictEqual(report.discovered, 1);
      assert.deepStrictEqual(
        yield* StoredPosts.use((stored) => stored.post(old.targetId)),
        Option.none()
      );
    }).pipe(Effect.provide(collectionWith()))
  );

  it.effect(
    "reads no more a post whose reads were put off past its window",
    () =>
      Effect.gen(function* expired() {
        const post = yield* publicationOf(
          workspaceId,
          yield* newChannelId,
          "2026-10-01T10:20:00.000Z"
        );

        yield* published(post);

        // Followed, then never read: the platform was down the whole time.
        yield* runAt("2026-10-01T11:07:00.000Z");

        const report = yield* runAt("2026-11-02T11:07:00.000Z");

        assert.deepStrictEqual(
          { deferred: report.deferred, ended: report.ended },
          { deferred: 0, ended: 1 }
        );
        assert.deepStrictEqual(yield* nextAtOf(post), Option.none());
      }).pipe(
        Effect.provide(
          collectionWith(() => Effect.fail(new PlatformUnavailable()))
        )
      )
  );
});

// Posts followed and due at the next run, `perChannel` on each of
// `channels` new channels, put in the store as a first run would have.
const followed = Effect.fn("followed")(function* followed(
  channels: number,
  perChannel: number
) {
  const posts: Publication[] = [];

  for (let channel = 0; channel < channels; channel += 1) {
    const channelId = yield* newChannelId;

    for (let post = 0; post < perChannel; post += 1) {
      posts.push(
        yield* publicationOf(workspaceId, channelId, "2026-11-02T10:20:00.000Z")
      );
    }
  }

  yield* TrackedPosts.use((tracked) =>
    tracked.track(posts.map(trackPublication))
  );

  return posts;
});

describe("collecting post metrics at scale", () => {
  it.effect(
    "reads 40,000 posts due on 8,000 channels in one run, within 30 seconds",
    () =>
      Effect.gen(function* tensOfThousands() {
        yield* followed(8000, 5);

        const startedAt = performance.now();
        const report = yield* runAt("2026-11-02T11:07:00.000Z");
        const seconds = (performance.now() - startedAt) / 1000;

        // Every post, where a run used to stop at its first 5,000.
        assert.deepStrictEqual(report, {
          deferred: 0,
          discovered: 0,
          ended: 0,
          left: 0,
          read: 40_000,
          skipped: 0,
        });
        assert.lengthOf(yield* requested, 8000);
        assert.isBelow(seconds, 30);
        assert.strictEqual((yield* Metric.value(collectionLeft)).value, 0);
      }).pipe(Effect.provide(collectionWith())),
    60_000
  );

  it.effect("reads so many channels at once, and no more", () =>
    Effect.gen(function* bounded() {
      yield* followed(200, 1);
      yield* runAt("2026-11-02T11:07:00.000Z");

      assert.strictEqual(yield* Ref.get(mostAtOnce), 16);
    }).pipe(
      Effect.provide(
        collectionWith((request) =>
          Ref.updateAndGet(readingNow, (count) => count + 1).pipe(
            Effect.tap((count) =>
              Ref.update(mostAtOnce, (most) => Math.max(most, count))
            ),
            Effect.andThen(Effect.yieldNow),
            Effect.andThen(countingAll(request)),
            Effect.ensuring(Ref.update(readingNow, (count) => count - 1))
          )
        )
      )
    )
  );

  it.effect(
    "stops reading at its budget, leaves the rest due and says how much",
    () =>
      Effect.gen(function* deadline() {
        const posts = yield* followed(12, 1);

        // Each read takes ten minutes, one channel at a time: five fit
        // before the 50th minute.
        const report = yield* runAt("2026-11-02T11:07:00.000Z");

        assert.deepStrictEqual(
          { left: report.left, read: report.read },
          { left: 7, read: 5 }
        );
        assert.strictEqual((yield* Metric.value(collectionLeft)).value, 7);
        assert.isAtLeast(
          (yield* Metric.value(collectionDuration)).value,
          50 * 60
        );

        // Left as they were: the next run reads those that waited longest
        // first, before it reads again the five it had.
        const next = yield* runAt("2026-11-02T13:07:00.000Z");

        const readSoFar = yield* Effect.forEach(
          posts,
          (post) => snapshotsOf(post),
          { concurrency: 1 }
        );

        assert.strictEqual(next.read, 5);
        assert.deepStrictEqual(
          readSoFar
            .map(({ length }) => length)
            .toSorted((left, right) => left - right),
          [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        );
      }).pipe(
        Effect.provide(
          collectionWith(
            (request) =>
              TestClock.adjust(Duration.minutes(10)).pipe(
                Effect.andThen(countingAll(request))
              ),
            { channelConcurrency: 1 }
          )
        )
      )
  );

  it.effect(
    "asks a channel that cannot be read once a run, and reads the others page after page",
    () =>
      Effect.gen(function* stalled() {
        const [first] = yield* followed(1, 6);

        assert(first !== undefined);
        yield* Ref.set(downChannel, Option.some(first.channelId));
        yield* followed(20, 1);

        const report = yield* runAt("2026-11-02T11:07:00.000Z");

        assert.deepStrictEqual(
          { deferred: report.deferred, left: report.left, read: report.read },
          { deferred: 6, left: 6, read: 20 }
        );
        assert.lengthOf(
          (yield* requested).filter(
            ({ channelId }) => channelId === first.channelId
          ),
          1
        );
      }).pipe(
        Effect.provide(
          collectionWith(
            (request) =>
              Ref.get(downChannel).pipe(
                Effect.flatMap((down) =>
                  Option.contains(down, request.channelId)
                    ? Effect.fail(new PlatformUnavailable())
                    : countingAll(request)
                )
              ),
            { channelsPerPage: 4 }
          )
        )
      )
  );

  it.effect(
    "starts a run where the last one stopped, so channels that hang never keep the others waiting run after run",
    () =>
      Effect.gen(function* takesTurns() {
        // Three channels due first, each 20 minutes without an answer, one
        // at a time: they take the first run's 50 minutes.
        const hanging = yield* followed(3, 1);

        yield* Ref.set(
          hangingChannels,
          new Set(hanging.map(({ channelId }) => channelId))
        );
        yield* followed(4, 1);

        const first = yield* runAt("2026-11-02T11:07:00.000Z");

        assert.deepStrictEqual(
          { left: first.left, read: first.read },
          { left: 7, read: 0 }
        );

        // The next run starts with the four the first never reached, then
        // comes back to those that hang.
        const second = yield* runAt("2026-11-02T12:07:00.000Z");

        assert.deepStrictEqual(
          { left: second.left, read: second.read },
          { left: 3, read: 4 }
        );
      }).pipe(
        Effect.provide(
          collectionWith(
            (request) =>
              Ref.get(hangingChannels).pipe(
                Effect.flatMap((hanging) =>
                  hanging.has(request.channelId)
                    ? TestClock.adjust(Duration.minutes(20)).pipe(
                        Effect.andThen(Effect.fail(new PlatformUnavailable()))
                      )
                    : countingAll(request)
                )
              ),
            { channelConcurrency: 1 }
          )
        )
      )
  );
});
