import { Cron, DateTime, Duration, Effect, Metric } from "effect";
import { ClusterCron } from "effect/cluster";

import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { Recycling } from "#publishing/application/recycling.ts";

/**
 * Every day at 04:17 UTC: deletes the idempotency keys past their lifetime.
 * A key past it is free again whether or not this ran; the run only keeps
 * the table from growing. A failed run is logged and the next day's
 * catches up.
 */
export const IdempotencyRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("17 4 * * *", "UTC"),
  execute: PostScheduling.use(
    (scheduling) => scheduling.forgetExpiredKeys
  ).pipe(
    Effect.tap((deleted) =>
      Effect.logInfo("Purged expired idempotency keys").pipe(
        Effect.annotateLogs({ deleted })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired idempotency keys failed", cause)
    )
  ),
  name: "publishing.idempotency-retention",
  skipIfOlderThan: Duration.hours(12),
});

/** How late a rule's next occurrence may be before it counts as overdue. */
export const recyclingOverdueAfter = Duration.minutes(30);

const overdue = Metric.gauge("peal.publishing.recycling.overdue", {
  description:
    "Active recycling rules whose next occurrence was due more than 30 minutes ago",
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
      DateTime.subtractDuration(yield* DateTime.now, recyclingOverdueAfter)
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
