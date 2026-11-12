import { Cron, DateTime, Duration, Effect, Metric } from "effect";
import { ClusterCron } from "effect/cluster";

import { Feeds } from "#publishing/application/feeds.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { Recycling } from "#publishing/application/recycling.ts";

/**
 * Every day at 04:17 UTC: deletes the idempotency keys past their lifetime,
 * the items each feed keeps past its 500 newest, and the hourly counts of
 * the reads members asked for a day old. A key past it is free again
 * whether or not this ran; the run only keeps the tables from growing. A failed run is logged and the next day's
 * catches up.
 */
export const IdempotencyRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("17 4 * * *", "UTC"),
  execute: Effect.gen(function* retention() {
    const deleted = yield* PostScheduling.use(
      (scheduling) => scheduling.forgetExpiredKeys
    );

    // Feeds' items past their newest, and the members' reads a day old.
    const pruned = yield* Feeds.use((feeds) => feeds.prune);

    yield* Effect.logInfo("Purged expired idempotency keys").pipe(
      Effect.annotateLogs({
        deleted,
        feedItems: pruned.items,
        feedReads: pruned.reads,
      })
    );
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired idempotency keys failed", cause)
    )
  ),
  name: "publishing.idempotency-retention",
  skipIfOlderThan: Duration.hours(12),
});

/**
 * How long after a rule's latest time (a queue's slot included) it may stay
 * unmade before it counts as overdue.
 */
export const recyclingOverdueAfter = Duration.minutes(30);

const overdue = Metric.gauge("peal.publishing.recycling.overdue", {
  description:
    "Active recycling rules a run should have made more than 30 minutes ago, but those it left to wait",
});

/**
 * Every ten minutes from minute 4: makes the occurrences of the recycling
 * rules due (`Recycling.makeDue`), on one runner. It calls no platform: each
 * occurrence is an ordinary post, which its own job publishes. A run that
 * meets the next one is safe, as each rule's row is locked, skipped when
 * held, and an occurrence's place among its rule's posts is unique. It says
 * how many it made, left and ended, then how many rules are overdue
 * (`peal.publishing.recycling.overdue`), which an alert watches.
 */
export const RecyclingCron = ClusterCron.make({
  cron: Cron.parseUnsafe("4-59/10 * * * *", "UTC"),
  execute: Effect.gen(function* recycling() {
    const rules = yield* Recycling;
    const run = yield* rules.makeDue;

    yield* Effect.logInfo("Made the recycling rules' occurrences due").pipe(
      Effect.annotateLogs({ ended: run.ended, left: run.left, made: run.made })
    );

    const late = yield* rules.overdue(
      DateTime.subtractDuration(yield* DateTime.now, recyclingOverdueAfter),
      run
    );

    yield* Metric.update(overdue, late);
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("Making the recycling rules' occurrences failed", cause)
    )
  ),
  name: "publishing.recycling",
  skipIfOlderThan: Duration.minutes(10),
});

/**
 * How long after it was due an active feed may stay unread before it
 * counts as overdue.
 */
export const feedsOverdueAfter = Duration.hours(1);

const feedsOverdue = Metric.gauge("peal.publishing.feeds.overdue", {
  description: "Active feeds due more than an hour ago and not read",
});

const feedsLeft = Metric.gauge("peal.publishing.feeds.left", {
  description:
    "Feeds still due when the last run ended: not reached before its budget",
});

const feedsDuration = Metric.gauge("peal.publishing.feeds.duration", {
  description: "How long the last run of the feeds took, in seconds",
});

const feedsUnfinished = Metric.counter("peal.publishing.feeds.unfinished", {
  description: "Runs of the feeds that stopped at their budget with feeds due",
});

/**
 * Every ten minutes from minute 6: reads the feeds that are due and makes
 * their new items (`Feeds.poll`), on one runner. It calls no platform:
 * each item becomes an ordinary draft, or an ordinary post whose own job
 * publishes it. A run that meets the next one is safe, as each feed is
 * taken under its row's lock, skipped when held, and an item is made once
 * (unique per feed). It stops starting reads eight minutes after its
 * time, says what it made and left, and sets
 * `peal.publishing.feeds.overdue`, which an alert watches.
 */
export const FeedsCron = ClusterCron.make({
  cron: Cron.parseUnsafe("6-59/10 * * * *", "UTC"),
  execute: Effect.gen(function* feeds() {
    const at = yield* ClusterCron.CurrentScheduledTime;
    const started = yield* DateTime.now;
    const service = yield* Feeds;
    const run = yield* service.poll(at);
    const ended = yield* DateTime.now;

    yield* Metric.update(
      feedsDuration,
      Duration.toSeconds(DateTime.distance(started, ended))
    );
    yield* Metric.update(feedsLeft, run.left);

    if (run.unfinished) {
      yield* Metric.update(feedsUnfinished, 1);
      yield* Effect.logWarning(
        "The feeds' run stopped at its budget: the feeds left are read by the runs that follow"
      ).pipe(Effect.annotateLogs({ ...run }));
    } else if (run.read > 0) {
      yield* Effect.logInfo("Read the feeds due").pipe(
        Effect.annotateLogs({ ...run })
      );
    }

    yield* Metric.update(
      feedsOverdue,
      yield* service.overdue(
        DateTime.subtractDuration(ended, feedsOverdueAfter)
      )
    );
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("Reading the feeds failed", cause)
    )
  ),
  name: "publishing.feeds",
  skipIfOlderThan: Duration.minutes(10),
});
