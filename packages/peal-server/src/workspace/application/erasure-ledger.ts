import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type {
  ErasureEntry,
  ErasureEntryId,
} from "#workspace/domain/erasure-ledger.ts";

import type { ErasureLedgerUnavailable } from "./erasure-ledger-unavailable.ts";

/**
 * The record of erasures kept outside the database, in the object store:
 * a restore of the database brings back what was erased since its backup,
 * and rolls back anything the database itself recorded of it. Each entry
 * holds ids and the time only. An erasure writes its entry unconfirmed as
 * the last step of its transaction, so none commits unrecorded, then
 * confirms it once committed, or discards it when the transaction failed.
 */
export class ErasureLedger extends Context.Service<
  ErasureLedger,
  {
    /** Writes the entry, replacing one of the same id. */
    readonly record: (
      entry: ErasureEntry
    ) => Effect.Effect<void, ErasureLedgerUnavailable>;
    /** Removes an entry whose erasure did not happen. */
    readonly discard: (
      id: ErasureEntryId
    ) => Effect.Effect<void, ErasureLedgerUnavailable>;
    /** Every entry, oldest first. */
    readonly entries: Effect.Effect<
      readonly ErasureEntry[],
      ErasureLedgerUnavailable
    >;
    /** Deletes the entries made before `cutoff`, and says how many. */
    readonly expire: (
      cutoff: DateTime.Utc
    ) => Effect.Effect<number, ErasureLedgerUnavailable>;
  }
>()("peal-server/workspace/application/ErasureLedger") {}
