import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A record kept for the law: a UUIDv7, ordered by when it was made. */
export const LegalRecordIdSchema = Uuid7Schema.pipe(
  Schema.brand("LegalRecordId")
);

export type LegalRecordId = typeof LegalRecordIdSchema.Type;
