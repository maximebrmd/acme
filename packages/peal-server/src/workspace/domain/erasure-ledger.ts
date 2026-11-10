import { DateTime, Schema } from "effect";

import {
  UserIdSchema,
  Uuid7Schema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";

/**
 * How long an entry of the erasure ledger is kept: a little longer than
 * the backups hold deleted data (5 weeks at most), so every deletion a
 * restore can bring back is still listed.
 */
export const erasureLedgerRetention = { days: 42 } as const;

/** The instant before which the ledger's entries have expired at `now`. */
export const erasureLedgerCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtract(now, erasureLedgerRetention);

/** An entry of the ledger: a UUIDv7, so entries sort by when they were made. */
export const ErasureEntryIdSchema = Uuid7Schema.pipe(
  Schema.brand("ErasureEntryId")
);

export type ErasureEntryId = typeof ErasureEntryIdSchema.Type;

/**
 * An erasure, as the ledger keeps it outside the database: ids and the
 * time only, never a name, an address or content. A workspace's deletion
 * names the workspace; an account's closure names the account and the
 * workspaces deleted with it. `confirmed` is false from the moment the
 * erasure is about to commit until it has: an entry left unconfirmed is an
 * erasure whose end the server never saw. Stored as JSON, so its shape is
 * persisted contract: add fields with a default, never rename one.
 */
export const ErasureEntrySchema = Schema.Struct({
  at: Schema.DateTimeUtcFromString,
  confirmed: Schema.Boolean,
  id: ErasureEntryIdSchema,
  userId: Schema.NullOr(UserIdSchema),
  version: Schema.Literal(1),
  workspaceIds: Schema.Array(WorkspaceIdSchema),
});

export type ErasureEntry = typeof ErasureEntrySchema.Type;
