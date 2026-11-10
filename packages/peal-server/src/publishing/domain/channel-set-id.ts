import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A channel set's id: a UUIDv7, so sets list oldest first. */
export const ChannelSetIdSchema = Uuid7Schema.pipe(
  Schema.brand("ChannelSetId")
);

export type ChannelSetId = typeof ChannelSetIdSchema.Type;
