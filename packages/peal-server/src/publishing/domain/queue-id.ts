import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A queue's id: a UUIDv7, so queues list oldest first. */
export const QueueIdSchema = Uuid7Schema.pipe(Schema.brand("QueueId"));

export type QueueId = typeof QueueIdSchema.Type;
