import { Context } from "effect";
import type { Effect } from "effect";

import type { Conversation } from "#engagement/domain/conversation.ts";
import type { DirectMessage } from "#engagement/domain/direct-message.ts";
import type { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Tells the workspace what happened to its direct messages, in the
 * transaction that records it: ids only, never who wrote nor what.
 */
export class MessageOutcomes extends Context.Service<
  MessageOutcomes,
  {
    /** Messages someone else sent, read for the first time. */
    readonly received: (
      conversation: Conversation,
      messages: readonly DirectMessage[]
    ) => Effect.Effect<void, DatabaseError>;
    /** A message sent from Peal that ended: sent, failed or unconfirmed. */
    readonly settled: (
      conversation: Conversation,
      message: OutgoingMessage
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/engagement/application/MessageOutcomes") {}
