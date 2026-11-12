import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A recycling rule's id: a UUIDv7, so rules list oldest first. */
export const RecyclingRuleIdSchema = Uuid7Schema.pipe(
  Schema.brand("RecyclingRuleId")
);

export type RecyclingRuleId = typeof RecyclingRuleIdSchema.Type;
