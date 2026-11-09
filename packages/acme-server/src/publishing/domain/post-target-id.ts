import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** The publication of one post on one channel. */
export const PostTargetIdSchema = Uuid7Schema.pipe(
  Schema.brand("PostTargetId")
);

export type PostTargetId = typeof PostTargetIdSchema.Type;
