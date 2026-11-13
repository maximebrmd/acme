import { Config, Cron, DateTime, Duration, Effect, Schema } from "effect";
import { ClusterCron, MachineId, Snowflake } from "effect/cluster";
import { SqlClient } from "effect/sql";
import type { SqlError } from "effect/sql";

// Effect's cluster storage keeps every message and reply it writes, unless an
// entity opts into MessageRetention (since effect 4.1.3), which neither the
// workflows nor the crons here do. This job removes what can no longer matter,
// reading Effect's own tables (cluster_messages, cluster_replies), so rerun its
// tests on every Effect upgrade.
//
// - A workflow execution is removed once its run has a final reply older than
//   the retention age, with every message of its address and of its durable
//   clock (same entity id). A suspended run also has a reply, which says
//   "Suspended": those executions are still waiting and stay.
// - A cron run is removed once it was processed longer ago than that.
//
// Message and reply ids are snowflakes, which start with the time they were
// written, so "older than" compares ids. Other entity types are left alone.

/** How long finished cluster rows are kept: 30 days unless configured. */
export const clusterRetentionAge = Config.Duration(
  "PEAL_CLUSTER_RETENTION"
).pipe(Config.withDefault(Duration.days(30)));

// Rows deleted per statement, so one run never holds long locks.
const batchSize = 500;

// Each statement answers one row: how many it removed.
const decodeCount = Schema.decodeUnknownEffect(
  Schema.Tuple([Schema.Struct({ count: Schema.Int })])
);

type Batch = Effect.Effect<
  number,
  Schema.SchemaError | SqlError.SqlError,
  SqlClient.SqlClient
>;

/** How many rows a purge removed. */
export interface PurgedClusterRows {
  readonly cronRuns: number;
  readonly executions: number;
}

const deleteFinishedExecutions = Effect.fn("ClusterRetention.executions")(
  function* deleteFinishedExecutions(before: Snowflake.Snowflake) {
    const sql = yield* SqlClient.SqlClient;

    const rows = yield* sql`
      WITH finished AS (
        SELECT m.entity_id
        FROM cluster_messages m
        JOIN cluster_replies r ON r.request_id = m.id AND r.kind = 0
        WHERE m.kind = 0
          AND m.tag = 'run'
          AND m.entity_type LIKE 'Workflow/%'
          AND m.entity_type <> 'Workflow/-/DurableClock'
          AND r.id < ${String(before)}::bigint
          AND NOT r.payload::jsonb @> '{"_tag":"Success","value":{"_tag":"Suspended"}}'
        LIMIT ${batchSize}
      ),
      doomed AS (
        SELECT id FROM cluster_messages
        WHERE entity_type LIKE 'Workflow/%'
          AND entity_id IN (SELECT entity_id FROM finished)
      ),
      replies AS (
        DELETE FROM cluster_replies
        WHERE request_id IN (SELECT id FROM doomed)
      ),
      messages AS (
        DELETE FROM cluster_messages
        WHERE id IN (SELECT id FROM doomed)
      )
      SELECT count(*)::int AS count FROM finished
    `;

    const [{ count }] = yield* decodeCount(rows);

    return count;
  }
);

const deleteFinishedCronRuns = Effect.fn("ClusterRetention.cronRuns")(
  function* deleteFinishedCronRuns(before: Snowflake.Snowflake) {
    const sql = yield* SqlClient.SqlClient;

    const rows = yield* sql`
      WITH done AS (
        SELECT m.id
        FROM cluster_messages m
        JOIN cluster_replies r ON r.request_id = m.id AND r.kind = 0
        WHERE m.entity_type LIKE 'ClusterCron/%'
          AND m.processed
          AND r.id < ${String(before)}::bigint
        LIMIT ${batchSize}
      ),
      replies AS (
        DELETE FROM cluster_replies
        WHERE request_id IN (SELECT id FROM done)
      ),
      messages AS (
        DELETE FROM cluster_messages
        WHERE id IN (SELECT id FROM done)
      )
      SELECT count(*)::int AS count FROM done
    `;

    const [{ count }] = yield* decodeCount(rows);

    return count;
  }
);

// Repeats a batch until one comes back short, and adds up what it removed.
const untilShort = (batch: Batch, total = 0): Batch =>
  batch.pipe(
    Effect.flatMap((count) =>
      count < batchSize
        ? Effect.succeed(total + count)
        : untilShort(batch, total + count)
    )
  );

/**
 * Deletes the cluster rows of workflow executions and cron runs that finished
 * more than `olderThan` ago.
 */
export const purgeFinishedClusterRows = Effect.fn("ClusterRetention.purge")(
  function* purgeFinishedClusterRows(olderThan: Duration.Duration) {
    const now = yield* DateTime.now;

    const before = Snowflake.make({
      machineId: MachineId.make(0),
      sequence: 0,
      timestamp: DateTime.toEpochMillis(
        DateTime.subtractDuration(now, olderThan)
      ),
    });

    const executions = yield* untilShort(deleteFinishedExecutions(before));
    const cronRuns = yield* untilShort(deleteFinishedCronRuns(before));

    const purged: PurgedClusterRows = { cronRuns, executions };

    return purged;
  }
);

/**
 * Purges finished cluster rows every day at 03:17 UTC. A failed run is logged
 * and the next day's run catches up.
 */
export const ClusterRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("17 3 * * *", "UTC"),
  execute: clusterRetentionAge.pipe(
    Effect.flatMap(purgeFinishedClusterRows),
    Effect.tap((purged) =>
      Effect.logInfo("Purged finished cluster rows", purged)
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging finished cluster rows failed", cause)
    )
  ),
  name: "cluster.retention",
  skipIfOlderThan: Duration.hours(12),
});
