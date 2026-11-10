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
    /**
     * Every entry that reads, oldest first. An object that does not read
     * as an entry, as one written by hand or cut short, is left out, and
     * listed by `unreadable`: it never keeps the others from being read.
     */
    readonly entries: Effect.Effect<
      readonly ErasureEntry[],
      ErasureLedgerUnavailable
    >;
    /**
     * The keys of the ledger's objects that do not read as entries: each
     * may be an erasure nobody can apply again, for a person to look at.
     */
    readonly unreadable: Effect.Effect<
      readonly string[],
      ErasureLedgerUnavailable
    >;
    /**
     * Deletes the entries made before `cutoff`, and says how many. What
     * does not read is kept: nothing says how old it is.
     */
    readonly expire: (
      cutoff: DateTime.Utc
    ) => Effect.Effect<number, ErasureLedgerUnavailable>;
  }
>()("peal-server/workspace/application/ErasureLedger") {}
