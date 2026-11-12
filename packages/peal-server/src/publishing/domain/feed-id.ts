import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A feed's id: a UUIDv7, so feeds list oldest first. */
export const FeedIdSchema = Uuid7Schema.pipe(Schema.brand("FeedId"));

export type FeedId = typeof FeedIdSchema.Type;
