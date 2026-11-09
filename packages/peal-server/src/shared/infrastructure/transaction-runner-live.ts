import { Effect, Layer, Schema } from "effect";
import { ClusterError, MessageStorage } from "effect/cluster";
import { SqlClient, SqlError } from "effect/sql";

import { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

const asDatabaseError = (cause: unknown) => new DatabaseError({ cause });

// The cluster's storage failing to save a message, as when a workflow is
// started or stopped.
const isPersistenceError = Schema.is(ClusterError.PersistenceError);

/**
 * Transactions that the cluster's message storage takes part in, so a use case
 * can write its rows and start a workflow atomically.
 *
 * The storage's transaction is the outer one: it holds back the notices that
 * wake workflows until the outermost commit, so no workflow runs on rows that
 * may still roll back. The SQL transaction inside it is what makes the rows
 * atomic when the storage is in memory, as in tests; on the SQL storage it is
 * a savepoint in the same transaction. Both must use the same SqlClient, which
 * the composition root guarantees by building one pool.
 *
 * The storage turns a failed BEGIN or COMMIT into a defect, and the workflow
 * engine a message it could not save, when starting or stopping a workflow;
 * both are reported as a DatabaseError, which callers can retry.
 */
export const TransactionRunnerLive = Layer.effect(
  TransactionRunner,
  Effect.gen(function* TransactionRunnerLive() {
    const storage = yield* MessageStorage.MessageStorage;
    const sql = yield* SqlClient.SqlClient;

    return TransactionRunner.of({
      transaction: (effect) =>
        storage.withTransaction(sql.withTransaction(effect)).pipe(
          Effect.catchIf(SqlError.isSqlError, (failure) =>
            Effect.fail(asDatabaseError(failure))
          ),
          Effect.catchDefect((defect) =>
            SqlError.isSqlError(defect) || isPersistenceError(defect)
              ? Effect.fail(asDatabaseError(defect))
              : Effect.die(defect)
          )
        ),
    });
  })
);
