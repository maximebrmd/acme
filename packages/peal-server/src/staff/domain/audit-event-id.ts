import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** An entry of the audit log: a UUIDv7, ordered by when it was made. */
export const AuditEventIdSchema = Uuid7Schema.pipe(
  Schema.brand("AuditEventId")
);

export type AuditEventId = typeof AuditEventIdSchema.Type;
