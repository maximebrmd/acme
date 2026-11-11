import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A change asked of a live post: a UUIDv7, so changes list oldest first. */
export const LivePostChangeIdSchema = Uuid7Schema.pipe(
  Schema.brand("LivePostChangeId")
);

export type LivePostChangeId = typeof LivePostChangeIdSchema.Type;
