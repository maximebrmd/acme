import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A comment's id in Peal; the platform's own id is kept beside it. */
export const CommentIdSchema = Uuid7Schema.pipe(Schema.brand("CommentId"));

export type CommentId = typeof CommentIdSchema.Type;
