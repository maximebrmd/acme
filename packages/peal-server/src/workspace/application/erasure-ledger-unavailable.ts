import { Schema } from "effect";

/**
 * The erasure ledger could not be written or read: the object store did
 * not answer, or refused. An erasure that cannot be recorded does not
 * happen.
 */
export class ErasureLedgerUnavailable extends Schema.TaggedError<ErasureLedgerUnavailable>()(
  "ErasureLedgerUnavailable",
  { cause: Schema.Defect() }
) {}
