import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "./database-error.ts";

/**
 * Runs an effect in one database transaction, which commits when it succeeds
 * and rolls back when it fails.
 *
 * Workflow starts sent inside it are part of the transaction too, so a use
 * case can save a row and start the job that acts on it with no window where
 * one exists without the other (a transactional outbox). Nested calls join the
 * outer transaction.
 */
export class TransactionRunner extends Context.Service<
  TransactionRunner,
  {
    readonly transaction: <A, E, R>(
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, DatabaseError | E, R>;
  }
>()("acme-server/shared/application/TransactionRunner") {}
