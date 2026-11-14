import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** An outgoing message's id: a UUIDv7, so a conversation's messages sent from Peal read in the order they were written. */
export const OutgoingMessageIdSchema = Uuid7Schema.pipe(
  Schema.brand("OutgoingMessageId")
);

export type OutgoingMessageId = typeof OutgoingMessageIdSchema.Type;
