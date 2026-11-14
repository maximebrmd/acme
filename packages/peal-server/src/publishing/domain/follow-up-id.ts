import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/**
 * The id of what a follow-up rule armed on one published target: a
 * UUIDv7. It is also the idempotency key of the call that carries it out.
 */
export const FollowUpIdSchema = Uuid7Schema.pipe(Schema.brand("FollowUpId"));

export type FollowUpId = typeof FollowUpIdSchema.Type;
