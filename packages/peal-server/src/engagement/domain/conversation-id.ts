import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A conversation's id: one conversation of a channel's account with other accounts, as Peal keeps it. */
export const ConversationIdSchema = Uuid7Schema.pipe(
  Schema.brand("ConversationId")
);

export type ConversationId = typeof ConversationIdSchema.Type;
