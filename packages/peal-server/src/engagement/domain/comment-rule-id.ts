import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A comment rule's id: a UUIDv7, so rules list oldest first. */
export const CommentRuleIdSchema = Uuid7Schema.pipe(
  Schema.brand("CommentRuleId")
);

export type CommentRuleId = typeof CommentRuleIdSchema.Type;
