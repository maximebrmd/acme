import { Context, DateTime, Effect, Layer } from "effect";

import { contractCutoff } from "#billing/domain/contract-retention.ts";
import { trialMemoryCutoff } from "#billing/domain/trial-memory.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { ContractRecords } from "./ports/contract-records.ts";
import { ContractRequests } from "./ports/contract-requests.ts";
import { Trials } from "./ports/trials.ts";

/**
 * Deletes the orders, withdrawals and requests to cancel or withdraw of
 * workspaces erased longer ago than `contractRetention`, the requests no
 * contract was found for received longer ago, and the pseudonyms of accounts closed after a trial
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
      const requests = yield* ContractRequests;

      const run = Effect.gen(function* run() {
        const now = yield* DateTime.now;
        const purged = yield* records.purge(contractCutoff(now));

        const forgotten = yield* trials.forgetPseudonyms(
          trialMemoryCutoff(now)
        );

        // Requests to cancel or withdraw are kept as long: from their
        // workspace's erasure, or from their receipt when no contract was
        // found for them.
        const asked = yield* requests.purge(contractCutoff(now));

        return purged + forgotten + asked;
      }).pipe(Effect.withSpan("PurgeContractRecords.run"));

      return PurgeContractRecords.of({ run });
    })
  );
}
