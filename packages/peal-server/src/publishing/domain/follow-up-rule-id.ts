import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A follow-up rule's id: a UUIDv7, so rules list oldest first. */
export const FollowUpRuleIdSchema = Uuid7Schema.pipe(
  Schema.brand("FollowUpRuleId")
);

export type FollowUpRuleId = typeof FollowUpRuleIdSchema.Type;
