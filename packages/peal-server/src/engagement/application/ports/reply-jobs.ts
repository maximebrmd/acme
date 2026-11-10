import { Context } from "effect";
import type { Effect } from "effect";

import type { ReplyId } from "#engagement/domain/reply-id.ts";

/**
 * Starts the durable job that sends a reply. Inside a TransactionRunner
 * transaction the start commits, or rolls back, with the reply's journal
 * row, and the job runs after the commit.
 */
export class ReplyJobs extends Context.Service<
  ReplyJobs,
  {
    readonly start: (replyId: ReplyId) => Effect.Effect<void>;
    /**
     * Stops the reply's job for good, whether it sleeps, waits its turn or
     * is lost: in a transaction, with what hands the reply to a person, so
     * the job cannot wake after. A job that has ended is left as it is.
     */
    readonly cancel: (replyId: ReplyId) => Effect.Effect<void>;
  }
>()("peal-server/engagement/application/ReplyJobs") {}
