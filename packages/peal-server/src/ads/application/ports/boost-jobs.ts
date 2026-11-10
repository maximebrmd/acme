import { Context } from "effect";
import type { Effect } from "effect";

import type { BoostId } from "#ads/domain/ids.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Starts the durable job that places a boost. Inside a TransactionRunner
 * transaction the start commits, or rolls back, with the boost: none
 * exists without the job that makes it.
 */
export class BoostJobs extends Context.Service<
  BoostJobs,
  {
    readonly start: (boostId: BoostId) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/ads/application/BoostJobs") {}
