import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A review's id: one review of a location, as Peal keeps it. */
export const ReviewIdSchema = Uuid7Schema.pipe(Schema.brand("ReviewId"));

export type ReviewId = typeof ReviewIdSchema.Type;
