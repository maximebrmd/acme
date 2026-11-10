import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** An activity event's id: a UUIDv7, so a workspace's log reads newest first. */
export const ActivityEventIdSchema = Uuid7Schema.pipe(
  Schema.brand("ActivityEventId")
);

export type ActivityEventId = typeof ActivityEventIdSchema.Type;
