import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A direct message's id: one message of a conversation, as Peal keeps it. */
export const DirectMessageIdSchema = Uuid7Schema.pipe(
  Schema.brand("DirectMessageId")
);

export type DirectMessageId = typeof DirectMessageIdSchema.Type;
