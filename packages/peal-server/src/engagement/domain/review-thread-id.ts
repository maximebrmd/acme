import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A reviews thread's id: the reviews of one location, on one channel. */
export const ReviewThreadIdSchema = Uuid7Schema.pipe(
  Schema.brand("ReviewThreadId")
);

export type ReviewThreadId = typeof ReviewThreadIdSchema.Type;
