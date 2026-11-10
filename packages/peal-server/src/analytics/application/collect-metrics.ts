import {
  Array as Arr,
  Context,
  DateTime,
  Duration,
  Effect,
  Function,
  Layer,
  Metric,
  Option,
  Ref,
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
import type { DueChannel, LatestPublication } from "./tracked-posts.ts";

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
  /**
   * Posts still due when the run stopped at its budget, the deferred ones
   * included, which the next run takes; none when it finished.
   */
  readonly left: number;
}

/** How a run of the collection is paced. */
export interface CollectionPace {
  /**
   * How long after its scheduled time a run starts no more reads: it stops
   * with time to spare before the next run, an hour after it.
   */
  readonly budget: Duration.Duration;
  /**
   * Channels read at the same time; each reads its posts one call at a
   * time, through its gate, in turn with its publishing.
   */
  readonly channelConcurrency: number;
  /** Channels with posts due taken from the store at a time. */
  readonly channelsPerPage: number;
}

/**
 * The pace of the collection: 16 channels at a time, pages of 500
 * channels, for 50 minutes. The server sets the concurrency from
 * `PEAL_ANALYTICS_CONCURRENCY`.
 */
export const CollectionPaceRef = Context.Reference<CollectionPace>(
  "peal-server/analytics/application/CollectionPace",
  {
    defaultValue: () => ({
      budget: Duration.minutes(50),
      channelConcurrency: 16,
      channelsPerPage: 500,
    }),
  }
);

/** How long the last collection run took, in seconds. */
export const collectionDuration = Metric.gauge(
  "peal.analytics.collection.duration",
  { description: "How long the last metrics collection run took, in seconds" }
);

/**
 * The posts the last collection run left due: 0 while runs finish and
 * platforms answer. Above 0 run after run, counts are read later than
 * their schedule says.
 */
export const collectionLeft = Metric.gauge("peal.analytics.collection.left", {
  description: "Posts still due when the last metrics collection run ended",
});

/** Collection runs that stopped at their budget with posts still due. */
export const collectionsUnfinished = Metric.counter(
  "peal.analytics.collection.unfinished",
  {
    description:
      "Metrics collection runs that could not finish in their budget",
    incremental: true,
  }
);

// A post publishing settles in a transaction that may commit a little
// after the instant it records: each run looks again this far back, and
// posts already followed stay as they are. It does so after following
// those that went live since the latest one, so however many went live
// within this time, every run moves on.
const discoveryOverlap = Duration.minutes(15);

const discoveryPage = 500;

// A run imports at most this many pages forward, and as many looking
// back; whatever is left waits for the next run.
const discoveryPages = 20;

// How long past its last turn a post that could not be read waits.
const overdue = Duration.days(1);

// Posts read in one call through a channel's gate: Bluesky reads 25 at
// once, and a call keeps the channel's publishing waiting.
const batchSize = 25;

// The most posts of one channel a run reads, 40 calls: a channel with more
// due keeps the rest for the next run, and holds no other channel back.
const postsPerChannel = 1000;

type Tally = Omit<CollectionReport, "discovered" | "left">;

// Whether the channel comes no later than `until` in the order the due
// channels are listed in: by how long they waited, then id, as Postgres
// compares them.
const comesBy = (channel: DueChannel, until: Option.Option<DueChannel>) =>
  Option.match(until, {
    onNone: () => true,
    onSome: (end) => {
      const order = DateTime.Order(channel.dueSince, end.dueSince);

      return order < 0 || (order === 0 && channel.channelId <= end.channelId);
    },
  });

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
      const pace = yield* CollectionPaceRef;

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
        tracked
          .saveSchedules(posts.map((post) => endCollection(post, reason, at)))
          .pipe(Effect.as<Tally>({ ...emptyTally, ended: posts.length }));

      const skipping = (posts: readonly TrackedPost[], at: DateTime.Utc) =>
        tracked
          .saveSchedules(posts.map((post) => skipReading(post, at)))
          .pipe(Effect.as<Tally>({ ...emptyTally, skipped: posts.length }));

      // Saves what a read found, the readings in one statement and the
      // schedules in another: a post missing, or whose read failed, waits
      // for its next turn; the posts it says nothing of stay due.
      const recordBatch = Effect.fn("CollectMetrics.recordBatch")(
        function* recordBatch(
          posts: readonly TrackedPost[],
          batch: MetricsBatch,
          at: DateTime.Utc
        ) {
          const collectedAt = yield* DateTime.now;
          const byTarget = new Map(posts.map((post) => [post.targetId, post]));
          const read: TrackedPost[] = [];
          const skipped: TrackedPost[] = [];

          for (const reading of batch.readings) {
            const post = byTarget.get(reading.targetId);

            if (post !== undefined) {
              byTarget.delete(reading.targetId);

              if (reading._tag === "counted") {
                read.push(
                  recordReading(post, reading.metrics, collectedAt, at)
                );
              } else {
                skipped.push(skipReading(post, at));
              }
            }
          }

          yield* tracked.saveReadings(read);
          yield* tracked.saveSchedules(skipped);

          const tally: Tally = {
            deferred: byTarget.size,
            ended: 0,
            read: read.length,
            skipped: skipped.length,
          };

          return tally;
        }
      );

      // A channel's due posts, one call at a time, until the platform asks
      // to slow down, the channel cannot be read, or the run is out of
      // time: it then starts no more reads, and the rest stays due.
      const collectChannel = Effect.fn("CollectMetrics.channel")(
        function* collectChannel(
          posts: Arr.NonEmptyReadonlyArray<TrackedPost>,
          at: DateTime.Utc,
          deadline: DateTime.Utc
        ) {
          const { channelId, workspaceId } = Arr.headNonEmpty(posts);
          let total = emptyTally;
          let left = [...posts];

          const stalledWith = (rest: number): Tally => ({
            ...total,
            deferred: total.deferred + rest,
          });

          while (left.length > 0) {
            if (
              DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
            ) {
              return stalledWith(left.length);
            }

            const batch = left.slice(0, batchSize);

            left = left.slice(batchSize);

            const outcome = yield* reader
              .read({
                channelId,
                posts: batch.map(({ platformPostId, targetId }) => ({
                  platformPostId,
                  targetId,
                })),
                workspaceId,
              })
              .pipe(Effect.result);

            if (outcome._tag === "Failure") {
              const rest = [...batch, ...left];
              const { failure } = outcome;

              if (failure._tag === "PlatformUnavailable") {
                return stalledWith(rest.length);
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
              return stalledWith(left.length);
            }
          }

          return total;
        }
      );

      // Where the last run stopped at its budget, in this process: the
      // next one starts after it. Without it, channels whose platform
      // hangs, due longest run after run, would take every run whole, and
      // those after them would never be read.
      const stoppedAt = yield* Ref.make(Option.none<DueChannel>());

      // Reads the posts due on the channels that come after `from`, up to
      // `until` when given, a page of channels at a time, each channel
      // once, until none is left or the run is out of time: it then says
      // after which channel it stopped.
      const collectLeg = Effect.fn("CollectMetrics.leg")(function* collectLeg(
        at: DateTime.Utc,
        deadline: DateTime.Utc,
        from: Option.Option<DueChannel>,
        until: Option.Option<DueChannel>
      ) {
        // A post whose reads kept being put off (its platform down, or
        // asking to slow down) is read no more once a day past its last
        // turn: its counts have long stopped moving.
        const isExpired = (post: TrackedPost) =>
          DateTime.isGreaterThanOrEqualTo(
            at,
            DateTime.addDuration(collectionEnd(post.publishedAt), overdue)
          );

        // A channel's turn, unless the run is out of time before it.
        const turnOf = (posts: readonly TrackedPost[]) =>
          Effect.gen(function* turn() {
            if (!Arr.isReadonlyArrayNonEmpty(posts)) {
              return { reached: true, tally: emptyTally };
            }

            if (
              DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
            ) {
              const tally: Tally = { ...emptyTally, deferred: posts.length };

              return { reached: false, tally };
            }

            return {
              reached: true,
              tally: yield* collectChannel(posts, at, deadline),
            };
          });

        let total = emptyTally;
        let after = from;

        while (true) {
          if (DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)) {
            return { stopped: Option.some(after), total };
          }

          const listed = yield* tracked.dueChannels(
            at,
            pace.channelsPerPage,
            after
          );

          const channels = listed.filter((channel) => comesBy(channel, until));

          const found = yield* tracked.dueOn(
            at,
            channels.map(({ channelId }) => channelId),
            postsPerChannel
          );

          const expired = found.filter((post) => isExpired(post));

          const due = Arr.groupBy(
            found.filter((post) => !isExpired(post)),
            (post) => post.channelId
          );

          total = addTallies(total, yield* ending(expired, "window", at));

          const turns = yield* Effect.forEach(
            channels,
            ({ channelId }) => turnOf(due[channelId] ?? []),
            { concurrency: pace.channelConcurrency }
          );

          for (const { tally } of turns) {
            total = addTallies(total, tally);
          }

          // Out of time: the next run starts after the last channel this
          // one took.
          const unreached = turns.findIndex(({ reached }) => !reached);

          if (unreached !== -1) {
            return {
              stopped: Option.some(
                Option.orElse(
                  Option.fromUndefinedOr(channels[unreached - 1]),
                  Function.constant(after)
                )
              ),
              total,
            };
          }

          after = Option.fromUndefinedOr(listed.at(-1));

          if (
            listed.length < pace.channelsPerPage ||
            channels.length < listed.length
          ) {
            return { stopped: Option.none<Option.Option<DueChannel>>(), total };
          }
        }
      });

      // Reads the posts due, the channels that waited longest first and
      // each once: those after where the last run stopped, then, from the
      // one that waited longest, those up to there.
      const collectDue = Effect.fn("CollectMetrics.due")(function* collectDue(
        at: DateTime.Utc,
        deadline: DateTime.Utc
      ) {
        const from = yield* Ref.get(stoppedAt);
        const rest = yield* collectLeg(at, deadline, from, Option.none());

        if (Option.isSome(rest.stopped) || Option.isNone(from)) {
          yield* Ref.set(stoppedAt, Option.flatten(rest.stopped));

          return { total: rest.total, unfinished: Option.isSome(rest.stopped) };
        }

        const start = yield* collectLeg(at, deadline, Option.none(), from);

        yield* Ref.set(stoppedAt, Option.flatten(start.stopped));

        return {
          total: addTallies(rest.total, start.total),
          unfinished: Option.isSome(start.stopped),
        };
      });

      const run = Effect.fn("CollectMetrics.run")(function* run(
        at: DateTime.Utc
      ) {
        const startedAt = yield* DateTime.now;
        const deadline = DateTime.addDuration(at, pace.budget);
        const discovered = yield* discover(at);
        const { total, unfinished } = yield* collectDue(at, deadline);

        // What is still due: the posts put off, those past a channel's
        // share of a run, and those a run out of time never reached.
        const left = yield* tracked.countDue(at);

        const report: CollectionReport = { discovered, ...total, left };
        const took = DateTime.distance(startedAt, yield* DateTime.now);

        yield* Metric.update(collectionDuration, Duration.toSeconds(took));
        yield* Metric.update(collectionLeft, left);

        if (unfinished) {
          yield* Metric.update(collectionsUnfinished, 1);
          yield* Effect.logWarning(
            "The metrics collection could not finish before the next run: the posts left are read by the runs that follow, later than their schedule says. Raise PEAL_ANALYTICS_CONCURRENCY if platforms answer"
          ).pipe(
            Effect.annotateLogs({
              ...report,
              seconds: Duration.toSeconds(took),
            })
          );
        }

        return report;
      });

      return CollectMetrics.of({ run });
    })
  );
}
