import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import { CollectMetrics } from "#analytics/application/collect-metrics.ts";
import type {
  MetricsBatch,
  MetricsReadFailure,
  MetricsRequest,
} from "#analytics/application/metrics-reader.ts";
import type { Publication } from "#analytics/domain/tracked-post.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
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
const collectionWith = (answer: Answer = countingAll) =>
  CollectMetrics.layer.pipe(
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
