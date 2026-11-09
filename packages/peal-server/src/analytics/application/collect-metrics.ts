import {
  Array as Arr,
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
} from "effect";

import {
  collectedFor,
  collectionEnd,
} from "#analytics/domain/collection-schedule.ts";
import {
  endCollection,
  recordReading,
  skipReading,
  trackPublication,
} from "#analytics/domain/tracked-post.ts";
import type {
  CollectionEnd,
  Publication,
  TrackedPost,
} from "#analytics/domain/tracked-post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { MetricsReader } from "./metrics-reader.ts";
import type { MetricsBatch } from "./metrics-reader.ts";
import { PublishedPosts } from "./published-posts.ts";
import type { PublicationCursor } from "./published-posts.ts";
import { TrackedPosts } from "./tracked-posts.ts";
import type { LatestPublication } from "./tracked-posts.ts";

/** What a run of the collection did. */
export interface CollectionReport {
  /** Posts that went live since the last run, now followed. */
  readonly discovered: number;
  /** Posts whose counts were read. */
  readonly read: number;
  /** Posts passed over until their next turn: gone from the platform, unreadable there, or on a channel that is off. */
  readonly skipped: number;
  /** Posts no longer read, their channel gone or their platform unread. */
  readonly ended: number;
  /** Posts left due for the next run: the platform asked to slow down, or was down. */
  readonly deferred: number;
}

// A post publishing settles in a transaction that may commit a little
// after the instant it records: each run looks again this far back, and
// posts already followed stay as they are. It does so after following
// those that went live since the latest one, so however many went live
// within this time, every run moves on.
const discoveryOverlap = Duration.minutes(15);

const discoveryPage = 500;

// A run imports at most this many pages forward, and as many looking
// back, and reads at most this many posts; whatever is left waits for the
// next run.
const discoveryPages = 20;

const maxDuePerRun = 5000;

// How long past its last turn a post that could not be read waits.
const overdue = Duration.days(1);

// Posts read in one call through a channel's gate: Bluesky reads 25 at
// once, and a call keeps the channel's publishing waiting.
const batchSize = 25;

// Channels read at the same time; each reads its posts one call at a time.
const channelConcurrency = 4;

type Tally = Omit<CollectionReport, "discovered">;

const emptyTally: Tally = { deferred: 0, ended: 0, read: 0, skipped: 0 };

// Whether a publication comes before another in publishing's order: when
// it went live, then its target's id.
const isBefore = (
  publication: Pick<Publication, "publishedAt" | "targetId">,
  other: LatestPublication
): boolean =>
  DateTime.isLessThan(publication.publishedAt, other.publishedAt) ||
  (DateTime.Equivalence(publication.publishedAt, other.publishedAt) &&
    publication.targetId < other.targetId);

const addTallies = (left: Tally, right: Tally): Tally => ({
  deferred: left.deferred + right.deferred,
  ended: left.ended + right.ended,
  read: left.read + right.read,
  skipped: left.skipped + right.skipped,
});

/**
 * Reads the counts of published posts on their platforms, run by the
 * hourly collection: it follows the posts that went live since the last
 * run, then reads those due, every hour for their first 48 hours and every
 * day until they are 30 days old. `at` is the run's scheduled time, which
 * the next reads are counted from.
 */
export class CollectMetrics extends Context.Service<
  CollectMetrics,
  {
    readonly run: (
      at: DateTime.Utc
    ) => Effect.Effect<CollectionReport, DatabaseError>;
  }
>()("peal-server/analytics/application/CollectMetrics") {
  static readonly layer = Layer.effect(
    CollectMetrics,
    Effect.gen(function* CollectMetricsLive() {
      const published = yield* PublishedPosts;
      const tracked = yield* TrackedPosts;
      const reader = yield* MetricsReader;

      // Follows the posts published from `from` on, a page at a time, until
      // there are no more, the pages run out, or a page reaches `until`.
      const follow = Effect.fn("CollectMetrics.follow")(function* follow(
        from: PublicationCursor,
        until: Option.Option<LatestPublication>
      ) {
        let cursor = from;
        let discovered = 0;

        for (let page = 0; page < discoveryPages; page += 1) {
          const publications = yield* published.from(cursor, discoveryPage);

          discovered += yield* tracked.track(
            publications.map(trackPublication)
          );

          const last = publications.at(-1);

          if (
            last === undefined ||
            publications.length < discoveryPage ||
            Option.exists(until, (end) => !isBefore(last, end))
          ) {
            break;
          }

          cursor = {
            publishedAt: last.publishedAt,
            targetId: Option.some(last.targetId),
          };
        }

        return discovered;
      });

      // Follows the posts published since the latest one followed, then
      // those that settled late before it; for a first run, those young
      // enough to be read.
      const discover = Effect.fn("CollectMetrics.discover")(function* discover(
        at: DateTime.Utc
      ) {
        const found = yield* tracked.latestPublication(at);

        if (Option.isNone(found)) {
          return yield* follow(
            {
              publishedAt: DateTime.subtractDuration(at, collectedFor),
              targetId: Option.none(),
            },
            Option.none()
          );
        }

        const latest = found.value;

        const since = yield* follow(
          {
            publishedAt: latest.publishedAt,
            targetId: Option.some(latest.targetId),
          },
          Option.none()
        );

        const late = yield* follow(
          {
            publishedAt: DateTime.subtractDuration(
              latest.publishedAt,
              discoveryOverlap
            ),
            targetId: Option.none(),
          },
          found
        );

        return since + late;
      });

      const ending = (
        posts: readonly TrackedPost[],
        reason: CollectionEnd,
        at: DateTime.Utc
      ) =>
        Effect.forEach(
          posts,
          (post) => tracked.saveSchedule(endCollection(post, reason, at)),
          { discard: true }
        ).pipe(Effect.as<Tally>({ ...emptyTally, ended: posts.length }));

      const skipping = (posts: readonly TrackedPost[], at: DateTime.Utc) =>
        Effect.forEach(
          posts,
          (post) => tracked.saveSchedule(skipReading(post, at)),
          { discard: true }
        ).pipe(Effect.as<Tally>({ ...emptyTally, skipped: posts.length }));

      // Saves what a read found: a post missing, or whose read failed,
      // waits for its next turn; the posts it says nothing of stay due.
      const recordBatch = Effect.fn("CollectMetrics.recordBatch")(
        function* recordBatch(
          posts: readonly TrackedPost[],
          batch: MetricsBatch,
          at: DateTime.Utc
        ) {
          const collectedAt = yield* DateTime.now;
          const byTarget = new Map(posts.map((post) => [post.targetId, post]));
          let read = 0;
          let skipped = 0;

          for (const reading of batch.readings) {
            const post = byTarget.get(reading.targetId);

            if (post !== undefined) {
              byTarget.delete(reading.targetId);

              if (reading._tag === "counted") {
                yield* tracked.saveReading(
                  recordReading(post, reading.metrics, collectedAt, at)
                );
                read += 1;
              } else {
                yield* tracked.saveSchedule(skipReading(post, at));
                skipped += 1;
              }
            }
          }

          const tally: Tally = {
            deferred: byTarget.size,
            ended: 0,
            read,
            skipped,
          };

          return tally;
        }
      );

      // A channel's due posts, one call at a time, until the platform asks
      // to slow down or the channel cannot be read.
      const collectChannel = Effect.fn("CollectMetrics.channel")(
        function* collectChannel(
          posts: Arr.NonEmptyReadonlyArray<TrackedPost>,
          at: DateTime.Utc
        ) {
          const { channelId } = Arr.headNonEmpty(posts);
          let total = emptyTally;
          let left = [...posts];

          while (left.length > 0) {
            const batch = left.slice(0, batchSize);

            left = left.slice(batchSize);

            const outcome = yield* reader
              .read({
                channelId,
                posts: batch.map(({ platformPostId, targetId }) => ({
                  platformPostId,
                  targetId,
                })),
              })
              .pipe(Effect.result);

            if (outcome._tag === "Failure") {
              const rest = [...batch, ...left];
              const { failure } = outcome;

              if (failure._tag === "PlatformUnavailable") {
                return { ...total, deferred: total.deferred + rest.length };
              }

              const tally =
                failure.reason === "paused"
                  ? yield* skipping(rest, at)
                  : yield* ending(rest, failure.reason, at);

              return addTallies(total, tally);
            }

            total = addTallies(
              total,
              yield* recordBatch(batch, outcome.success, at)
            );

            if (outcome.success.halted) {
              return { ...total, deferred: total.deferred + left.length };
            }
          }

          return total;
        }
      );

      const run = Effect.fn("CollectMetrics.run")(function* run(
        at: DateTime.Utc
      ) {
        const discovered = yield* discover(at);

        // A post whose reads kept being put off (its platform down, or
        // asking to slow down) is read no more once a day past its last
        // turn: its counts have long stopped moving.
        const found = yield* tracked.due(at, maxDuePerRun);

        const isExpired = (post: TrackedPost) =>
          DateTime.isGreaterThanOrEqualTo(
            at,
            DateTime.addDuration(collectionEnd(post.publishedAt), overdue)
          );

        const expired = found.filter((post) => isExpired(post));
        const due = found.filter((post) => !isExpired(post));

        const ended = yield* ending(expired, "window", at);

        const byChannel = Object.values(
          Arr.groupBy(due, (post) => post.channelId)
        );

        const tallies = yield* Effect.forEach(
          byChannel,
          (posts) => collectChannel(posts, at),
          { concurrency: channelConcurrency }
        );

        let total = ended;

        for (const tally of tallies) {
          total = addTallies(total, tally);
        }

        const report: CollectionReport = { discovered, ...total };

        return report;
      });

      return CollectMetrics.of({ run });
    })
  );
}
