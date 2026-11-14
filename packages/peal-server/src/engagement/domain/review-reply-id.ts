import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A reply to a review's id: a UUIDv7, so a review's replies read in the order they were written. */
export const ReviewReplyIdSchema = Uuid7Schema.pipe(
  Schema.brand("ReviewReplyId")
);

export type ReviewReplyId = typeof ReviewReplyIdSchema.Type;
