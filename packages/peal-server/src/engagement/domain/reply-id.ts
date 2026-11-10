import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A reply's id: a UUIDv7, so a thread's replies read in the order they were written. */
export const ReplyIdSchema = Uuid7Schema.pipe(Schema.brand("ReplyId"));

export type ReplyId = typeof ReplyIdSchema.Type;
