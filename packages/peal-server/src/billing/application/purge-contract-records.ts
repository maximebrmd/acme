import { Context, DateTime, Effect, Layer } from "effect";

import { contractCutoff } from "#billing/domain/contract-retention.ts";
import { trialMemoryCutoff } from "#billing/domain/trial-memory.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { ContractRecords } from "./ports/contract-records.ts";
import { Trials } from "./ports/trials.ts";

/**
 * Deletes the orders and withdrawals of workspaces erased longer ago than
 * `contractRetention`, and the pseudonyms of accounts closed after a trial
 * longer ago than `trialMemory`, daily, on the `billing.contract-retention`
 * cron. Says how many it deleted.
 */
export class PurgeContractRecords extends Context.Service<
  PurgeContractRecords,
  { readonly run: Effect.Effect<number, DatabaseError> }
>()("peal-server/billing/application/PurgeContractRecords") {
  static readonly layer = Layer.effect(
    PurgeContractRecords,
    Effect.gen(function* PurgeContractRecordsLive() {
      const records = yield* ContractRecords;
      const trials = yield* Trials;

      const run = Effect.gen(function* run() {
        const now = yield* DateTime.now;
        const purged = yield* records.purge(contractCutoff(now));

        const forgotten = yield* trials.forgetPseudonyms(
          trialMemoryCutoff(now)
        );

        return purged + forgotten;
      }).pipe(Effect.withSpan("PurgeContractRecords.run"));

      return PurgeContractRecords.of({ run });
    })
  );
}
