import { Context } from "effect";
import type { Effect } from "effect";

import type { OutgoingMessageId } from "#engagement/domain/outgoing-message-id.ts";

/**
 * Starts the durable job that sends a message. Inside a TransactionRunner
 * transaction the start commits, or rolls back, with the message's
 * journal row, and the job runs after the commit.
 */
export class MessageJobs extends Context.Service<
  MessageJobs,
  {
    readonly start: (messageId: OutgoingMessageId) => Effect.Effect<void>;
    /**
     * Stops the message's job for good, in a transaction with what hands
     * the message to a person, so the job cannot wake after. A job that
     * has ended is left as it is.
     */
    readonly cancel: (messageId: OutgoingMessageId) => Effect.Effect<void>;
  }
>()("peal-server/engagement/application/MessageJobs") {}
